import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MarketplaceService, RevenueStats } from '../../../core/services/marketplace.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-merchant-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CurrencyPipe, MatIconModule],
  template: `
    <div class="merchant-layout">

      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-avatar merchant">{{ initials() }}</div>
          <div>
            <p class="brand-name">{{ user?.firstName }} {{ user?.lastName }}</p>
            <span class="role-badge merchant">Commerçant</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/merchant/dashboard" routerLinkActive="active">
            <mat-icon>dashboard</mat-icon> Tableau de bord
          </a>
          <a routerLink="/merchant/catalog" routerLinkActive="active">
            <mat-icon>menu_book</mat-icon> Catalogue artisans
          </a>
          <a routerLink="/merchant/my-products" routerLinkActive="active">
            <mat-icon>storefront</mat-icon> Mes produits
          </a>
          <a routerLink="/marketplace" routerLinkActive="active">
            <mat-icon>explore</mat-icon> Marketplace
          </a>
          <a routerLink="/account" routerLinkActive="active">
            <mat-icon>settings</mat-icon> Paramètres
          </a>
        </nav>

        <div class="sidebar-cta">
          <mat-icon>brush</mat-icon>
          <p>Personnalisez des produits artisanaux avec votre marque</p>
          <a routerLink="/merchant/catalog" class="cta-link">Accéder au catalogue</a>
        </div>
      </aside>

      <!-- Main content -->
      <main class="main-content">
        <div class="page-header">
          <div>
            <h1>Bonjour, {{ user?.firstName }} 👋</h1>
            <p>Gérez votre boutique white-label</p>
          </div>
          <a routerLink="/merchant/catalog" class="btn-primary">
            <mat-icon>add</mat-icon> Personnaliser un produit
          </a>
        </div>

        @if (stats()) {
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon profit">
                <mat-icon>trending_up</mat-icon>
              </div>
              <div class="stat-body">
                <span class="stat-label">Marge totale</span>
                <span class="stat-value">{{ stats()!.totalRevenue | currency:'EUR':'symbol':'1.2-2' }}</span>
                <span class="stat-sub">Prix vente − gros − commission</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon orders">
                <mat-icon>receipt_long</mat-icon>
              </div>
              <div class="stat-body">
                <span class="stat-label">Commandes</span>
                <span class="stat-value">{{ stats()!.totalOrders }}</span>
                <span class="stat-sub">Toutes périodes</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon products">
                <mat-icon>inventory_2</mat-icon>
              </div>
              <div class="stat-body">
                <span class="stat-label">Produits publiés</span>
                <span class="stat-value">{{ myProducts().length }}</span>
                <span class="stat-sub">Dans votre boutique</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon commission">
                <mat-icon>percent</mat-icon>
              </div>
              <div class="stat-body">
                <span class="stat-label">Frais plateforme</span>
                <span class="stat-value">15%</span>
                <span class="stat-sub">Du prix de vente</span>
              </div>
            </div>
          </div>
        }

        <!-- How the model works -->
        <div class="model-card">
          <div class="model-header">
            <h2>Votre modèle économique</h2>
            <p>Comprenez comment calculer votre marge</p>
          </div>
          <div class="formula-row">
            <div class="formula-item">
              <span class="formula-label">Prix de vente</span>
              <span class="formula-value example">150 €</span>
            </div>
            <span class="formula-op">−</span>
            <div class="formula-item">
              <span class="formula-label">Prix grossiste</span>
              <span class="formula-value cost">80 €</span>
            </div>
            <span class="formula-op">−</span>
            <div class="formula-item">
              <span class="formula-label">Commission (15%)</span>
              <span class="formula-value cost">22.50 €</span>
            </div>
            <span class="formula-op">=</span>
            <div class="formula-item highlight">
              <span class="formula-label">Votre marge</span>
              <span class="formula-value profit">47.50 €</span>
            </div>
          </div>
        </div>

        <!-- My products quick view -->
        <div class="section-card">
          <div class="section-header">
            <h2>Mes produits récents</h2>
            <a routerLink="/merchant/my-products" class="see-all">Voir tout</a>
          </div>

          @if (myProducts().length === 0) {
            <div class="empty-state">
              <mat-icon>storefront</mat-icon>
              <h3>Votre boutique est vide</h3>
              <p>Choisissez des produits artisanaux et personnalisez-les avec votre marque.</p>
              <a routerLink="/merchant/catalog" class="btn-outline">
                <mat-icon>menu_book</mat-icon> Explorer le catalogue
              </a>
            </div>
          } @else {
            <div class="products-list">
              @for (p of myProducts().slice(0, 4); track p.id) {
                <div class="product-row">
                  <div class="product-thumb">
                    <img [src]="p.images[0]?.url || 'assets/placeholder.png'" [alt]="p.title">
                  </div>
                  <div class="product-meta">
                    <h4>{{ p.title }}</h4>
                    <span class="artisan-tag">Par {{ p.artisanBrand }}</span>
                  </div>
                  <div class="product-pricing">
                    <span class="retail">{{ p.retailPrice | currency:'EUR':'symbol':'1.2-2' }}</span>
                    <span class="wholesale">Gros: {{ p.wholesalePrice | currency:'EUR':'symbol':'1.2-2' }}</span>
                  </div>
                  <div class="product-status" [class.published]="p.published">
                    {{ p.published ? 'Publié' : 'Brouillon' }}
                  </div>
                  <a [routerLink]="['/merchant/brand-studio', p.id]" class="edit-btn">
                    <mat-icon>brush</mat-icon>
                  </a>
                </div>
              }
            </div>
          }
        </div>

      </main>
    </div>
  `,
  styles: [`
    .merchant-layout { display: grid; grid-template-columns: 280px 1fr; min-height: calc(100vh - 116px); background: var(--off-white); }

    /* Sidebar */
    .sidebar { background: var(--black); padding: 32px 0; display: flex; flex-direction: column; }
    .sidebar-brand {
      display: flex; align-items: center; gap: 14px;
      padding: 0 24px 28px; border-bottom: 1px solid var(--border-dark); margin-bottom: 12px;
    }
    .brand-avatar {
      width: 44px; height: 44px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 600;
      &.merchant { background: var(--burgundy); color: white; }
    }
    .brand-name { color: var(--cream); font-size: 14px; font-weight: 500; margin-bottom: 4px; }
    .role-badge {
      font-size: 9px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
      padding: 2px 8px; border: 1px solid;
      &.merchant { color: #E8A0A0; border-color: var(--burgundy); }
    }
    .sidebar-nav {
      flex: 1; display: flex; flex-direction: column;
      a {
        display: flex; align-items: center; gap: 12px; padding: 13px 24px;
        color: rgba(245,240,232,0.5); font-size: 12px; text-decoration: none; transition: all 0.2s;
        mat-icon { font-size: 18px; width: 18px; height: 18px; }
        &:hover { color: var(--cream); background: rgba(255,255,255,0.04); }
        &.active { color: var(--gold); background: rgba(197,168,110,0.08); border-left: 2px solid var(--gold); }
      }
    }
    .sidebar-cta {
      margin: 24px; padding: 20px; border: 1px solid rgba(255,255,255,0.08);
      text-align: center;
      mat-icon { color: var(--gold); margin-bottom: 8px; }
      p { font-size: 12px; color: rgba(245,240,232,0.5); line-height: 1.6; margin-bottom: 14px; }
    }
    .cta-link {
      display: inline-block; background: var(--gold-dark); color: white;
      font-size: 10px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;
      padding: 8px 16px; text-decoration: none;
      &:hover { background: var(--gold); }
    }

    /* Main */
    .main-content { padding: 40px 48px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;
      h1 { font-family: 'Cormorant Garamond', serif; font-size: 34px; font-weight: 500; margin-bottom: 4px; }
      p { font-size: 13px; color: var(--text-secondary); }
    }
    .btn-primary {
      display: flex; align-items: center; gap: 8px; background: var(--burgundy); color: white;
      padding: 12px 24px; font-size: 11px; font-weight: 600; letter-spacing: 0.15em;
      text-transform: uppercase; text-decoration: none; border: none; cursor: pointer;
      mat-icon { font-size: 18px; }
      &:hover { background: #8B1A2A; }
    }

    /* Stats */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 28px; }
    .stat-card { background: white; border: 1px solid var(--border); padding: 24px; display: flex; gap: 16px; }
    .stat-icon {
      width: 44px; height: 44px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &.profit { background: #E8F5E9; mat-icon { color: #388E3C; } }
      &.orders { background: #E3F2FD; mat-icon { color: #1565C0; } }
      &.products { background: #FFF8E7; mat-icon { color: var(--gold-dark); } }
      &.commission { background: #FCE4EC; mat-icon { color: #C62828; } }
    }
    .stat-body { display: flex; flex-direction: column; }
    .stat-label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 6px; }
    .stat-value { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 600; color: var(--black); margin-bottom: 4px; }
    .stat-sub { font-size: 11px; color: var(--text-secondary); }

    /* Model card */
    .model-card {
      background: white; border: 1px solid var(--border); padding: 32px; margin-bottom: 28px;
    }
    .model-header { margin-bottom: 24px;
      h2 { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 500; margin-bottom: 4px; }
      p { font-size: 13px; color: var(--text-secondary); }
    }
    .formula-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .formula-item {
      display: flex; flex-direction: column; gap: 4px;
      background: var(--off-white); padding: 16px 20px; min-width: 120px;
      &.highlight { background: var(--black); }
      .formula-label { font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-secondary); }
      .formula-value { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 600;
        &.example { color: var(--black); }
        &.cost { color: #C62828; }
        &.profit { color: #388E3C; }
      }
      &.highlight .formula-label { color: rgba(245,240,232,0.5); }
      &.highlight .formula-value { color: var(--gold); }
    }
    .formula-op { font-size: 24px; color: var(--text-secondary); font-weight: 300; }

    /* Section card */
    .section-card { background: white; border: 1px solid var(--border); padding: 28px; }
    .section-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
      h2 { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 500; }
      .see-all { font-size: 12px; color: var(--gold-dark); text-decoration: none; font-weight: 500; }
    }

    .products-list { display: flex; flex-direction: column; gap: 12px; }
    .product-row {
      display: flex; align-items: center; gap: 16px; padding: 12px;
      border: 1px solid var(--border); background: var(--off-white);
    }
    .product-thumb { width: 56px; height: 56px; flex-shrink: 0;
      img { width: 100%; height: 100%; object-fit: cover; } }
    .product-meta { flex: 1;
      h4 { font-size: 14px; font-weight: 500; color: var(--black); margin-bottom: 3px; }
      .artisan-tag { font-size: 11px; color: var(--gold-dark); font-weight: 500; letter-spacing: 0.05em; }
    }
    .product-pricing { text-align: right;
      .retail { display: block; font-size: 15px; font-weight: 600; color: var(--black); }
      .wholesale { font-size: 11px; color: var(--text-secondary); }
    }
    .product-status {
      font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      padding: 4px 10px; background: #F5F5F5; color: var(--text-secondary);
      &.published { background: #E8F5E9; color: #388E3C; }
    }
    .edit-btn {
      display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border: 1px solid var(--border); cursor: pointer;
      text-decoration: none; color: var(--text-secondary); transition: all 0.2s;
      mat-icon { font-size: 18px; }
      &:hover { border-color: var(--gold-dark); color: var(--gold-dark); }
    }

    .empty-state {
      text-align: center; padding: 60px 24px;
      mat-icon { font-size: 52px; width: 52px; height: 52px; color: var(--border); display: block; margin: 0 auto 16px; }
      h3 { font-family: 'Cormorant Garamond', serif; font-size: 24px; margin-bottom: 8px; }
      p { font-size: 14px; color: var(--text-secondary); margin-bottom: 24px; }
    }
    .btn-outline {
      display: inline-flex; align-items: center; gap: 8px;
      border: 1px solid var(--black); color: var(--black);
      padding: 12px 24px; font-size: 11px; font-weight: 600; letter-spacing: 0.15em;
      text-transform: uppercase; text-decoration: none;
      mat-icon { font-size: 18px; }
      &:hover { background: var(--black); color: var(--cream); }
    }
  `]
})
export class MerchantDashboardComponent implements OnInit {
  private marketplaceService = inject(MarketplaceService);
  private authService = inject(AuthService);

  user = this.authService.getUser();
  stats = signal<RevenueStats | null>(null);
  myProducts = signal<any[]>([]);

  initials(): string {
    if (!this.user) return 'M';
    return (this.user.firstName.charAt(0) + this.user.lastName.charAt(0)).toUpperCase();
  }

  ngOnInit(): void {
    this.marketplaceService.getMerchantStats().subscribe({
      next: s => this.stats.set(s),
      error: () => {}
    });

    this.marketplaceService.getMerchantProducts().subscribe({
      next: (data: any) => this.myProducts.set(data.content ?? data ?? []),
      error: () => {}
    });
  }
}
