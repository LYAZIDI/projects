import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MarketplaceService, MarketplaceProduct } from '../../../core/services/marketplace.service';

@Component({
  selector: 'app-merchant-catalog',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, SlicePipe, MatIconModule],
  template: `
    <div class="merchant-layout">
      <aside class="sidebar">
        <nav class="sidebar-nav">
          <a routerLink="/merchant/dashboard"><mat-icon>dashboard</mat-icon> Tableau de bord</a>
          <a routerLink="/merchant/catalog" class="active"><mat-icon>menu_book</mat-icon> Catalogue artisans</a>
          <a routerLink="/merchant/my-products"><mat-icon>storefront</mat-icon> Mes produits</a>
        </nav>
      </aside>

      <main class="main-content">
        <div class="page-header">
          <div>
            <h1>Catalogue Artisanal</h1>
            <p>Choisissez un produit à personnaliser avec votre marque</p>
          </div>
        </div>

        <div class="how-it-works">
          <div class="step">
            <span class="step-num">1</span>
            <span>Choisissez un produit</span>
          </div>
          <mat-icon>arrow_forward</mat-icon>
          <div class="step">
            <span class="step-num">2</span>
            <span>Personnalisez avec votre logo</span>
          </div>
          <mat-icon>arrow_forward</mat-icon>
          <div class="step">
            <span class="step-num">3</span>
            <span>Publiez dans votre boutique</span>
          </div>
        </div>

        @if (loading()) {
          <div class="loading-grid">
            @for (i of [1,2,3,4,5,6]; track i) {
              <div class="skeleton-card"></div>
            }
          </div>
        } @else if (products().length === 0) {
          <div class="empty-state">
            <mat-icon>inventory_2</mat-icon>
            <p>Aucun produit artisanal disponible pour le moment.</p>
          </div>
        } @else {
          <div class="catalog-grid">
            @for (product of products(); track product.id) {
              <div class="catalog-card">
                <div class="card-image">
                  <img [src]="product.images[0]?.url || 'assets/placeholder.png'" [alt]="product.title">
                  <div class="artisan-badge">{{ product.artisanBrand || product.vendor }}</div>
                </div>
                <div class="card-body">
                  <h3>{{ product.title }}</h3>
                  <p class="description">{{ product.description | slice:0:80 }}...</p>

                  <div class="pricing">
                    <div class="price-item">
                      <span class="price-label">Prix public</span>
                      <span class="price-value retail">{{ product.price | currency:'EUR':'symbol':'1.2-2' }}</span>
                    </div>
                    <div class="price-item">
                      <span class="price-label">Prix grossiste</span>
                      <span class="price-value wholesale">{{ product.wholesalePrice | currency:'EUR':'symbol':'1.2-2' }}</span>
                    </div>
                    <div class="price-item">
                      <span class="price-label">Votre marge max</span>
                      <span class="price-value margin">
                        {{ calcMargin(product) | currency:'EUR':'symbol':'1.2-2' }}
                      </span>
                    </div>
                  </div>

                  <a [routerLink]="['/merchant/brand-studio', product.id]" class="customize-btn">
                    <mat-icon>brush</mat-icon>
                    Personnaliser
                  </a>
                </div>
              </div>
            }
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .merchant-layout { display: grid; grid-template-columns: 260px 1fr; min-height: calc(100vh - 116px); background: var(--off-white); }
    .sidebar { background: var(--black); padding: 24px 0; }
    .sidebar-nav {
      display: flex; flex-direction: column;
      a {
        display: flex; align-items: center; gap: 12px; padding: 13px 24px;
        color: rgba(245,240,232,0.5); font-size: 12px; text-decoration: none; transition: all 0.2s;
        mat-icon { font-size: 18px; width: 18px; height: 18px; }
        &:hover, &.active { color: var(--gold); background: rgba(197,168,110,0.08); }
        &.active { border-left: 2px solid var(--gold); }
      }
    }

    .main-content { padding: 40px 48px; }
    .page-header { margin-bottom: 28px;
      h1 { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 500; margin-bottom: 4px; }
      p { font-size: 13px; color: var(--text-secondary); }
    }

    .how-it-works {
      display: flex; align-items: center; gap: 12px; background: white;
      border: 1px solid var(--border); padding: 16px 24px; margin-bottom: 32px;
      mat-icon { color: var(--text-secondary); }
    }
    .step {
      display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-secondary);
      .step-num {
        width: 24px; height: 24px; border-radius: 50%; background: var(--gold-dark);
        color: white; display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: 700; flex-shrink: 0;
      }
    }

    .catalog-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .catalog-card { background: white; border: 1px solid var(--border); overflow: hidden; display: flex; flex-direction: column; }
    .card-image {
      position: relative; aspect-ratio: 4/3; overflow: hidden;
      img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
      &:hover img { transform: scale(1.04); }
    }
    .artisan-badge {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: rgba(0,0,0,0.6); color: white; backdrop-filter: blur(4px);
      font-size: 10px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase;
      padding: 8px 12px;
    }
    .card-body { padding: 20px; display: flex; flex-direction: column; flex: 1; }
    h3 { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 500;
         color: var(--black); margin-bottom: 8px; }
    .description { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px; }
    .pricing {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 18px;
      background: var(--off-white); padding: 14px; border: 1px solid var(--border);
    }
    .price-item { text-align: center; }
    .price-label { display: block; font-size: 9px; font-weight: 600; letter-spacing: 0.1em;
                   text-transform: uppercase; color: var(--text-secondary); margin-bottom: 4px; }
    .price-value { font-family: 'Cormorant Garamond', serif; font-size: 16px; font-weight: 600;
      &.retail { color: var(--black); }
      &.wholesale { color: var(--text-secondary); }
      &.margin { color: #388E3C; }
    }
    .customize-btn {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      background: var(--burgundy); color: white; padding: 13px;
      font-size: 11px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase;
      text-decoration: none; margin-top: auto; border: none; cursor: pointer; transition: background 0.2s;
      mat-icon { font-size: 18px; }
      &:hover { background: #8B1A2A; }
    }

    .loading-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .skeleton-card { height: 420px; background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
                     background-size: 400% 100%; animation: shimmer 1.4s ease infinite; }
    @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
    .empty-state { text-align: center; padding: 80px;
      mat-icon { font-size: 56px; width: 56px; height: 56px; color: var(--border); display: block; margin: 0 auto 16px; }
      p { font-size: 14px; color: var(--text-secondary); }
    }
  `]
})
export class MerchantCatalogComponent implements OnInit {
  private marketplaceService = inject(MarketplaceService);

  products = signal<MarketplaceProduct[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.marketplaceService.getMarketplaceProducts(0, 24).subscribe({
      next: (data: any) => {
        this.products.set(data.content ?? data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  calcMargin(product: MarketplaceProduct): number {
    const commission = product.price * 0.15;
    return product.price - product.wholesalePrice - commission;
  }
}
