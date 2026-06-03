import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MarketplaceService, CustomizedProduct } from '../../../core/services/marketplace.service';

@Component({
  selector: 'app-merchant-products',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, MatIconModule],
  template: `
    <div class="merchant-layout">
      <aside class="sidebar">
        <nav class="sidebar-nav">
          <a routerLink="/merchant/dashboard"><mat-icon>dashboard</mat-icon> Tableau de bord</a>
          <a routerLink="/merchant/catalog"><mat-icon>menu_book</mat-icon> Catalogue artisans</a>
          <a routerLink="/merchant/my-products" class="active"><mat-icon>storefront</mat-icon> Mes produits</a>
        </nav>
      </aside>

      <main class="main-content">
        <div class="page-header">
          <div>
            <h1>Ma Boutique</h1>
            <p>{{ products().length }} produit(s) personnalisé(s)</p>
          </div>
          <a routerLink="/merchant/catalog" class="btn-primary">
            <mat-icon>add</mat-icon> Ajouter un produit
          </a>
        </div>

        @if (loading()) {
          <div class="loading-state">Chargement...</div>
        } @else if (products().length === 0) {
          <div class="empty-state">
            <mat-icon>storefront</mat-icon>
            <h3>Boutique vide</h3>
            <p>Vous n'avez pas encore personnalisé de produit.<br>
               Explorez le catalogue et utilisez le Studio de Marque.</p>
            <a routerLink="/merchant/catalog" class="btn-outline">Explorer le catalogue</a>
          </div>
        } @else {
          <div class="products-grid">
            @for (product of products(); track product.id) {
              <div class="product-card">
                <div class="product-image">
                  <img [src]="product.images[0]?.url || 'assets/placeholder.png'" [alt]="product.title">

                  @if (product.merchantLogoUrl) {
                    <div class="brand-overlay">
                      <img [src]="product.merchantLogoUrl" alt="Logo" class="brand-logo">
                    </div>
                  }

                  <div class="status-tag" [class.published]="product.published">
                    {{ product.published ? 'Publié' : 'Brouillon' }}
                  </div>
                </div>

                <div class="product-body">
                  <div class="merchant-brand">{{ product.merchantBrand }}</div>
                  <h3>{{ product.title }}</h3>
                  <p class="artisan-tag">Par {{ product.artisanBrand }}</p>

                  <div class="pricing">
                    <div class="price-row">
                      <span>Prix de vente</span>
                      <strong>{{ product.retailPrice | currency:'EUR':'symbol':'1.2-2' }}</strong>
                    </div>
                    <div class="price-row">
                      <span>Prix grossiste</span>
                      <span class="muted">{{ product.wholesalePrice | currency:'EUR':'symbol':'1.2-2' }}</span>
                    </div>
                    <div class="price-row margin">
                      <span>Votre marge</span>
                      <strong class="green">{{ calcMargin(product) | currency:'EUR':'symbol':'1.2-2' }}</strong>
                    </div>
                  </div>

                  @if (product.labelType && product.labelType !== 'NONE') {
                    <div class="customizations">
                      <span class="custom-tag">
                        <mat-icon>style</mat-icon>
                        {{ labelName(product.labelType) }}
                      </span>
                    </div>
                  }

                  <div class="card-actions">
                    <a [routerLink]="['/merchant/brand-studio', product.id]" class="btn-edit">
                      <mat-icon>brush</mat-icon> Modifier
                    </a>

                    @if (!product.published) {
                      <button class="btn-publish" (click)="togglePublish(product)">
                        <mat-icon>publish</mat-icon> Publier
                      </button>
                    } @else {
                      <button class="btn-unpublish" (click)="togglePublish(product)">
                        <mat-icon>unpublished</mat-icon> Dépublier
                      </button>
                    }
                  </div>
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
        &:hover, &.active { color: var(--gold); }
        &.active { border-left: 2px solid var(--gold); background: rgba(197,168,110,0.08); }
      }
    }

    .main-content { padding: 40px 48px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;
      h1 { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 500; margin-bottom: 4px; }
      p { font-size: 13px; color: var(--text-secondary); }
    }
    .btn-primary {
      display: flex; align-items: center; gap: 8px; background: var(--burgundy); color: white;
      padding: 12px 24px; font-size: 11px; font-weight: 600; letter-spacing: 0.15em;
      text-transform: uppercase; text-decoration: none;
      mat-icon { font-size: 18px; }
      &:hover { background: #8B1A2A; }
    }

    .products-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .product-card { background: white; border: 1px solid var(--border); display: flex; flex-direction: column; }

    .product-image {
      position: relative; aspect-ratio: 4/3; overflow: hidden; background: #EDE8E0;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .brand-overlay {
      position: absolute; bottom: 10px; right: 10px;
      background: rgba(255,255,255,0.9); padding: 6px 10px;
      border: 1px solid rgba(255,255,255,0.8);
      .brand-logo { max-width: 64px; max-height: 32px; object-fit: contain; display: block; }
    }
    .status-tag {
      position: absolute; top: 10px; left: 10px;
      font-size: 9px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;
      padding: 4px 10px; background: rgba(0,0,0,0.5); color: rgba(255,255,255,0.7);
      backdrop-filter: blur(4px);
      &.published { background: rgba(56,142,60,0.85); color: white; }
    }

    .product-body { padding: 20px; flex: 1; display: flex; flex-direction: column; }
    .merchant-brand { font-size: 10px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase;
                      color: var(--burgundy); margin-bottom: 6px; }
    h3 { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 500;
         color: var(--black); margin-bottom: 4px; }
    .artisan-tag { font-size: 11px; color: var(--text-secondary); margin-bottom: 14px; }

    .pricing { background: var(--off-white); padding: 12px; margin-bottom: 14px; }
    .price-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 5px 0; font-size: 13px; color: var(--text-secondary);
      &.margin { border-top: 1px solid var(--border); margin-top: 4px; padding-top: 8px; }
      .muted { color: var(--text-secondary); }
      .green { color: #388E3C; }
    }

    .customizations { margin-bottom: 14px; }
    .custom-tag {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--gold-dark); border: 1px solid var(--gold-dark); padding: 3px 10px;
      mat-icon { font-size: 14px; }
    }

    .card-actions { display: flex; gap: 8px; margin-top: auto; }
    .btn-edit {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
      border: 1px solid var(--border); color: var(--text-secondary); padding: 10px;
      font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-decoration: none;
      mat-icon { font-size: 16px; }
      &:hover { border-color: var(--gold-dark); color: var(--gold-dark); }
    }
    .btn-publish, .btn-unpublish {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
      border: none; padding: 10px; font-size: 11px; font-weight: 600; letter-spacing: 0.1em;
      cursor: pointer; text-transform: uppercase;
      mat-icon { font-size: 16px; }
    }
    .btn-publish { background: var(--black); color: var(--cream);
                   &:hover { background: var(--gold-dark); } }
    .btn-unpublish { background: var(--off-white); color: var(--text-secondary); border: 1px solid var(--border);
                     &:hover { background: #FFEBEE; color: #C62828; border-color: #C62828; } }

    .empty-state { text-align: center; padding: 80px 24px;
      mat-icon { font-size: 56px; width: 56px; height: 56px; color: var(--border); display: block; margin: 0 auto 16px; }
      h3 { font-family: 'Cormorant Garamond', serif; font-size: 26px; margin-bottom: 10px; }
      p { font-size: 14px; color: var(--text-secondary); line-height: 1.8; margin-bottom: 24px; }
    }
    .btn-outline {
      display: inline-block; border: 1px solid var(--black); color: var(--black);
      padding: 12px 28px; font-size: 11px; font-weight: 600; letter-spacing: 0.15em;
      text-transform: uppercase; text-decoration: none;
      &:hover { background: var(--black); color: var(--cream); }
    }
    .loading-state { text-align: center; padding: 80px; color: var(--text-secondary); }
  `]
})
export class MerchantProductsComponent implements OnInit {
  private marketplaceService = inject(MarketplaceService);

  products = signal<CustomizedProduct[]>([]);
  loading = signal(true);

  private labelNames: Record<string, string> = {
    LEATHER_PATCH: 'Patch en cuir',
    WOVEN_LABEL: 'Étiquette tissée',
    EMBROIDERY: 'Broderie',
    METAL_PLATE: 'Plaque métal',
    NONE: 'Sans personnalisation'
  };

  ngOnInit(): void {
    this.marketplaceService.getMerchantProducts().subscribe({
      next: (data: any) => {
        this.products.set(data.content ?? data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  calcMargin(product: CustomizedProduct): number {
    const commission = product.retailPrice * 0.15;
    return product.retailPrice - product.wholesalePrice - commission;
  }

  labelName(type: string): string {
    return this.labelNames[type] ?? type;
  }

  togglePublish(product: CustomizedProduct): void {
    const action = product.published
      ? this.marketplaceService.unpublishProduct(product.id)
      : this.marketplaceService.publishProduct(product.id);

    action.subscribe({
      next: (updated) => {
        this.products.update(list =>
          list.map(p => p.id === updated.id ? updated : p)
        );
      }
    });
  }
}
