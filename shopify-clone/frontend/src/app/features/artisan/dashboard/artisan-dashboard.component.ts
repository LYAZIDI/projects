import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MarketplaceService, RevenueStats } from '../../../core/services/marketplace.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-artisan-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CurrencyPipe, DecimalPipe, MatIconModule],
  template: `
    <div class="artisan-layout">

      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-avatar">{{ initials() }}</div>
          <div>
            <p class="brand-name">{{ user?.firstName }} {{ user?.lastName }}</p>
            <span class="role-badge">Artisan</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/artisan/dashboard" routerLinkActive="active">
            <mat-icon>dashboard</mat-icon> Tableau de bord
          </a>
          <a routerLink="/artisan/products" routerLinkActive="active">
            <mat-icon>inventory_2</mat-icon> Mes produits
          </a>
          <a routerLink="/artisan/earnings" routerLinkActive="active">
            <mat-icon>account_balance_wallet</mat-icon> Revenus
          </a>
          <a routerLink="/marketplace" routerLinkActive="active">
            <mat-icon>storefront</mat-icon> Marketplace
          </a>
          <a routerLink="/account" routerLinkActive="active">
            <mat-icon>settings</mat-icon> Paramètres
          </a>
        </nav>
      </aside>

      <!-- Main content -->
      <main class="main-content">
        <div class="page-header">
          <div>
            <h1>Bonjour, {{ user?.firstName }} 👋</h1>
            <p>Voici un aperçu de votre activité</p>
          </div>
          <a routerLink="/artisan/products" class="btn-primary">
            <mat-icon>add</mat-icon> Ajouter un produit
          </a>
        </div>

        @if (loading()) {
          <div class="loading-state">Chargement des statistiques...</div>
        } @else if (stats()) {
          <!-- Stats cards -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon revenue">
                <mat-icon>account_balance_wallet</mat-icon>
              </div>
              <div class="stat-body">
                <span class="stat-label">Revenus totaux</span>
                <span class="stat-value">{{ stats()!.totalRevenue | currency:'EUR':'symbol':'1.2-2' }}</span>
                <span class="stat-sub">Commissions reçues</span>
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
              <div class="stat-icon rating">
                <mat-icon>star</mat-icon>
              </div>
              <div class="stat-body">
                <span class="stat-label">Note moyenne</span>
                <span class="stat-value">{{ stats()!.rating | number:'1.1-1' }} / 5</span>
                <span class="stat-sub">{{ stats()!.reviewCount }} avis</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon commission">
                <mat-icon>percent</mat-icon>
              </div>
              <div class="stat-body">
                <span class="stat-label">Commission plateforme</span>
                <span class="stat-value">15%</span>
                <span class="stat-sub">Par transaction</span>
              </div>
            </div>
          </div>
        }

        <!-- How it works -->
        <div class="info-section">
          <h2>Comment ça marche ?</h2>
          <div class="steps">
            <div class="step">
              <div class="step-num">1</div>
              <div class="step-content">
                <h4>Vous listez vos produits</h4>
                <p>Ajoutez vos créations avec photos, description et prix de gros.</p>
              </div>
            </div>
            <div class="step">
              <div class="step-num">2</div>
              <div class="step-content">
                <h4>Les commerçants personnalisent</h4>
                <p>Ils ajoutent leur marque et revendent vos produits sous leur nom.</p>
              </div>
            </div>
            <div class="step">
              <div class="step-num">3</div>
              <div class="step-content">
                <h4>Vous êtes payé automatiquement</h4>
                <p>Dès qu'une vente est réalisée, votre prix de gros est viré via Stripe.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent commissions -->
        <div class="recent-section">
          <div class="section-header">
            <h2>Dernières commissions</h2>
            <a routerLink="/artisan/earnings" class="see-all">Voir tout</a>
          </div>

          @if (recentCommissions().length === 0) {
            <div class="empty-state">
              <mat-icon>receipt_long</mat-icon>
              <p>Aucune commission pour le moment</p>
              <a routerLink="/artisan/products" class="btn-outline">Ajouter un produit</a>
            </div>
          } @else {
            <table class="commissions-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Commerçant</th>
                  <th>Vente</th>
                  <th>Votre part</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                @for (c of recentCommissions(); track c.id) {
                  <tr>
                    <td>{{ c.order?.orderNumber }}</td>
                    <td>{{ c.merchant?.brandName }}</td>
                    <td>{{ c.saleAmount | currency:'EUR':'symbol':'1.2-2' }}</td>
                    <td class="amount">{{ c.wholesaleAmount | currency:'EUR':'symbol':'1.2-2' }}</td>
                    <td><span class="status" [class]="c.status.toLowerCase()">{{ c.status }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

      </main>
    </div>
  `,
  styles: [`
    .artisan-layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      min-height: calc(100vh - 116px);
      background: var(--off-white);
    }

    /* Sidebar */
    .sidebar {
      background: var(--black);
      padding: 32px 0;
      border-right: 1px solid var(--border-dark);
    }
    .sidebar-brand {
      display: flex; align-items: center; gap: 14px;
      padding: 0 24px 28px; border-bottom: 1px solid var(--border-dark);
      margin-bottom: 12px;
    }
    .brand-avatar {
      width: 44px; height: 44px; border-radius: 50%;
      background: var(--gold-dark); color: white;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 600;
    }
    .brand-name { color: var(--cream); font-size: 14px; font-weight: 500; margin-bottom: 4px; }
    .role-badge {
      font-size: 9px; font-weight: 700; letter-spacing: 0.2em;
      text-transform: uppercase; color: var(--gold);
      border: 1px solid var(--gold-dark); padding: 2px 8px;
    }

    .sidebar-nav {
      display: flex; flex-direction: column;
      a {
        display: flex; align-items: center; gap: 12px;
        padding: 13px 24px;
        color: rgba(245,240,232,0.5);
        font-size: 12px; font-weight: 500; letter-spacing: 0.05em;
        text-decoration: none; transition: all 0.2s;
        mat-icon { font-size: 18px; width: 18px; height: 18px; }
        &:hover { color: var(--cream); background: rgba(255,255,255,0.04); }
        &.active { color: var(--gold); background: rgba(197,168,110,0.08);
                   border-left: 2px solid var(--gold); }
      }
    }

    /* Main */
    .main-content { padding: 40px 48px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 36px;
      h1 { font-family: 'Cormorant Garamond', serif; font-size: 34px;
           font-weight: 500; color: var(--black); margin-bottom: 4px; }
      p { font-size: 13px; color: var(--text-secondary); }
    }
    .btn-primary {
      display: flex; align-items: center; gap: 8px;
      background: var(--black); color: var(--cream);
      padding: 12px 24px; font-size: 11px; font-weight: 600;
      letter-spacing: 0.15em; text-transform: uppercase;
      text-decoration: none; border: none; cursor: pointer;
      &:hover { background: var(--gold-dark); }
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    /* Stats grid */
    .stats-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;
      margin-bottom: 36px;
    }
    .stat-card {
      background: white; border: 1px solid var(--border);
      padding: 24px; display: flex; gap: 16px; align-items: flex-start;
    }
    .stat-icon {
      width: 44px; height: 44px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &.revenue { background: #FFF8E7; mat-icon { color: var(--gold-dark); } }
      &.orders { background: #E8F5E9; mat-icon { color: #388E3C; } }
      &.rating { background: #FFF3E0; mat-icon { color: #E65100; } }
      &.commission { background: #EDE7F6; mat-icon { color: #512DA8; } }
    }
    .stat-body { display: flex; flex-direction: column; }
    .stat-label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em;
                  text-transform: uppercase; color: var(--text-secondary); margin-bottom: 6px; }
    .stat-value { font-family: 'Cormorant Garamond', serif; font-size: 26px;
                  font-weight: 600; color: var(--black); margin-bottom: 4px; }
    .stat-sub { font-size: 11px; color: var(--text-secondary); }

    /* Info section */
    .info-section {
      background: white; border: 1px solid var(--border); padding: 32px;
      margin-bottom: 28px;
      h2 { font-family: 'Cormorant Garamond', serif; font-size: 24px;
           font-weight: 500; margin-bottom: 24px; }
    }
    .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .step { display: flex; gap: 16px; }
    .step-num {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--gold-dark); color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 700; flex-shrink: 0;
    }
    .step-content {
      h4 { font-size: 14px; font-weight: 600; color: var(--black); margin-bottom: 6px; }
      p { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
    }

    /* Recent commissions */
    .recent-section {
      background: white; border: 1px solid var(--border); padding: 28px;
    }
    .section-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
      h2 { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 500; }
      .see-all { font-size: 12px; color: var(--gold-dark); text-decoration: none;
                 font-weight: 500; letter-spacing: 0.05em; }
    }
    .commissions-table {
      width: 100%; border-collapse: collapse;
      th, td { padding: 12px 16px; text-align: left; font-size: 13px; border-bottom: 1px solid var(--border); }
      th { font-size: 10px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;
           color: var(--text-secondary); }
      .amount { font-weight: 600; color: var(--black); }
    }
    .status {
      font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      padding: 3px 10px; border-radius: 2px;
      &.transferred { background: #E8F5E9; color: #388E3C; }
      &.calculated { background: #FFF8E7; color: var(--gold-dark); }
      &.pending { background: #F5F5F5; color: var(--text-secondary); }
      &.failed { background: #FFEBEE; color: #C62828; }
    }

    .empty-state {
      text-align: center; padding: 48px;
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--border); margin-bottom: 12px; }
      p { color: var(--text-secondary); margin-bottom: 20px; }
    }
    .btn-outline {
      border: 1px solid var(--black); color: var(--black); padding: 10px 24px;
      font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase;
      text-decoration: none;
      &:hover { background: var(--black); color: var(--cream); }
    }
    .loading-state { padding: 40px; text-align: center; color: var(--text-secondary); }
  `]
})
export class ArtisanDashboardComponent implements OnInit {
  private marketplaceService = inject(MarketplaceService);
  private authService = inject(AuthService);

  user = this.authService.getUser();
  stats = signal<RevenueStats | null>(null);
  recentCommissions = signal<any[]>([]);
  loading = signal(true);

  initials(): string {
    if (!this.user) return 'A';
    return (this.user.firstName.charAt(0) + this.user.lastName.charAt(0)).toUpperCase();
  }

  ngOnInit(): void {
    this.marketplaceService.getArtisanStats().subscribe({
      next: s => { this.stats.set(s); this.loading.set(false); },
      error: () => this.loading.set(false)
    });

    this.marketplaceService.getArtisanCommissions(0, 5).subscribe({
      next: (data: any) => this.recentCommissions.set(data.content ?? []),
      error: () => {}
    });
  }
}
