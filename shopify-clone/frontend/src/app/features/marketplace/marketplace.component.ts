import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DecimalPipe, SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MarketplaceService, ArtisanProfile, MarketplaceProduct } from '../../core/services/marketplace.service';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [RouterLink, FormsModule, CurrencyPipe, DecimalPipe, SlicePipe, MatIconModule],
  template: `
    <div class="marketplace-page">

      <!-- Hero banner -->
      <section class="hero">
        <div class="hero-content">
          <p class="hero-eyebrow">La plateforme du cuir artisanal</p>
          <h1>Découvrez des créateurs<br>d'exception</h1>
          <p class="hero-sub">Des artisans passionnés, des matières nobles, des pièces uniques.</p>

          <div class="search-bar">
            <mat-icon>search</mat-icon>
            <input [(ngModel)]="searchQuery" (keyup.enter)="search()"
                   placeholder="Rechercher un produit, un artisan, une spécialité...">
            <button (click)="search()">Rechercher</button>
          </div>

          <div class="hero-tabs">
            <button [class.active]="activeTab() === 'products'" (click)="activeTab.set('products')">
              Produits
            </button>
            <button [class.active]="activeTab() === 'artisans'" (click)="activeTab.set('artisans')">
              Artisans
            </button>
          </div>
        </div>
      </section>

      <!-- Products grid -->
      @if (activeTab() === 'products') {
        <section class="section page-container">
          <div class="section-header">
            <h2>Catalogue Artisanal</h2>
            <p>{{ products().length }} produits disponibles</p>
          </div>

          @if (loading()) {
            <div class="loading-grid">
              @for (i of [1,2,3,4,5,6]; track i) {
                <div class="skeleton-card"></div>
              }
            </div>
          } @else {
            <div class="products-grid">
              @for (product of products(); track product.id) {
                <a class="product-card" [routerLink]="['/products', product.slug]">
                  <div class="card-image">
                    <img [src]="product.images[0]?.url || 'assets/placeholder.png'"
                         [alt]="product.title">
                    <div class="card-overlay">
                      <span>VOIR LE PRODUIT</span>
                    </div>
                  </div>
                  <div class="card-info">
                    <span class="vendor">{{ product.artisanBrand || product.vendor }}</span>
                    <h3>{{ product.title }}</h3>
                    <div class="price-row">
                      <span class="price">{{ product.price | currency:'EUR':'symbol':'1.2-2' }}</span>
                      <span class="wholesale">Prix gros: {{ product.wholesalePrice | currency:'EUR':'symbol':'1.2-2' }}</span>
                    </div>
                  </div>
                </a>
              }
            </div>
          }
        </section>
      }

      <!-- Artisans grid -->
      @if (activeTab() === 'artisans') {
        <section class="section page-container">
          <div class="section-header">
            <h2>Nos Artisans</h2>
            <p>{{ artisans().length }} maisons partenaires</p>
          </div>

          @if (loading()) {
            <div class="loading-grid">
              @for (i of [1,2,3,4,5,6]; track i) {
                <div class="skeleton-card"></div>
              }
            </div>
          } @else {
            <div class="artisans-grid">
              @for (artisan of artisans(); track artisan.id) {
                <div class="artisan-card">
                  <div class="artisan-avatar">
                    {{ artisan.brandName.charAt(0) }}
                  </div>
                  <div class="artisan-info">
                    <div class="artisan-header">
                      <h3>{{ artisan.brandName }}</h3>
                      @if (artisan.verified) {
                        <mat-icon class="verified-icon">verified</mat-icon>
                      }
                    </div>
                    <p class="artisan-location">
                      <mat-icon>location_on</mat-icon>
                      {{ artisan.location || 'France' }}
                    </p>
                    <p class="artisan-bio">{{ artisan.bio | slice:0:120 }}...</p>
                    <div class="artisan-stats">
                      <div class="stat">
                        <span class="stat-value">{{ artisan.rating | number:'1.1-1' }}</span>
                        <span class="stat-label">Note</span>
                      </div>
                      <div class="stat">
                        <span class="stat-value">{{ artisan.reviewCount }}</span>
                        <span class="stat-label">Avis</span>
                      </div>
                      <div class="stat">
                        <span class="stat-value">{{ artisan.totalSales }}</span>
                        <span class="stat-label">Ventes</span>
                      </div>
                    </div>
                    @if (artisan.specialties?.length) {
                      <div class="specialties">
                        @for (spec of artisan.specialties.slice(0, 3); track spec) {
                          <span class="tag">{{ spec }}</span>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </section>
      }

      <!-- CTA for merchants -->
      <section class="merchant-cta">
        <div class="page-container">
          <div class="cta-inner">
            <div class="cta-text">
              <span class="cta-eyebrow">Vous êtes commerçant ?</span>
              <h2>Personnalisez ces produits<br>avec votre marque</h2>
              <p>Accédez au studio de marque et créez votre collection white-label en quelques clics.</p>
              <a routerLink="/merchant/catalog" class="cta-btn">Accéder au catalogue pro</a>
            </div>
            <div class="cta-visual">
              <div class="visual-block">
                <mat-icon>brush</mat-icon>
                <span>Studio de Marque</span>
              </div>
              <div class="visual-block">
                <mat-icon>local_shipping</mat-icon>
                <span>Livraison directe</span>
              </div>
              <div class="visual-block">
                <mat-icon>inventory_2</mat-icon>
                <span>Stock géré</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  `,
  styles: [`
    .marketplace-page { background: var(--off-white); }

    /* Hero */
    .hero {
      background: var(--black);
      padding: 80px 24px;
      text-align: center;
    }
    .hero-content { max-width: 700px; margin: 0 auto; }
    .hero-eyebrow {
      font-size: 11px; font-weight: 600; letter-spacing: 0.3em;
      text-transform: uppercase; color: var(--gold); margin-bottom: 16px;
    }
    h1 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 52px; font-weight: 500; color: var(--cream);
      margin-bottom: 16px; line-height: 1.15;
    }
    .hero-sub { font-size: 15px; color: rgba(245,240,232,0.6); margin-bottom: 36px; }

    .search-bar {
      display: flex; align-items: center; gap: 12px;
      background: white; border: 1px solid rgba(255,255,255,0.15);
      padding: 0 20px; max-width: 560px; margin: 0 auto 28px;

      mat-icon { color: var(--text-secondary); }
      input {
        flex: 1; border: none; outline: none; padding: 16px 0;
        font-size: 14px; font-family: 'Montserrat', sans-serif;
      }
      button {
        background: var(--gold-dark); color: white; border: none;
        padding: 8px 20px; font-size: 11px; font-weight: 600;
        letter-spacing: 0.15em; cursor: pointer; text-transform: uppercase;
        white-space: nowrap;
        &:hover { background: var(--gold); }
      }
    }

    .hero-tabs {
      display: flex; gap: 4px; justify-content: center;
      button {
        background: none; border: 1px solid rgba(255,255,255,0.15);
        color: rgba(245,240,232,0.5); padding: 8px 28px;
        font-size: 11px; font-weight: 500; letter-spacing: 0.15em;
        text-transform: uppercase; cursor: pointer; transition: all 0.2s;
        &.active { background: var(--gold-dark); border-color: var(--gold-dark); color: white; }
        &:hover:not(.active) { border-color: rgba(255,255,255,0.3); color: var(--cream); }
      }
    }

    /* Section */
    .section { padding: 64px 32px; }
    .section-header {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 40px;
      h2 {
        font-family: 'Cormorant Garamond', serif;
        font-size: 34px; font-weight: 500; color: var(--black);
      }
      p { font-size: 13px; color: var(--text-secondary); }
    }

    /* Products grid */
    .products-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px;
    }
    .product-card {
      display: block; text-decoration: none; color: inherit;
      background: white; border: 1px solid var(--border);
      transition: box-shadow 0.3s;
      &:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
    }
    .card-image {
      position: relative; aspect-ratio: 3/4; overflow: hidden;
      background: #F0EBE3;
      img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s; }
      &:hover img { transform: scale(1.05); }
      &:hover .card-overlay { opacity: 1; }
    }
    .card-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.3s;
      span { color: white; font-size: 10px; font-weight: 600; letter-spacing: 0.25em;
             border: 1px solid rgba(255,255,255,0.6); padding: 10px 20px; }
    }
    .card-info { padding: 20px; }
    .vendor { font-size: 10px; font-weight: 600; letter-spacing: 0.2em;
              text-transform: uppercase; color: var(--gold-dark); display: block; margin-bottom: 6px; }
    h3 { font-family: 'Cormorant Garamond', serif; font-size: 18px;
         font-weight: 500; color: var(--black); margin-bottom: 10px; }
    .price-row { display: flex; justify-content: space-between; align-items: center; }
    .price { font-size: 16px; font-weight: 500; color: var(--black); }
    .wholesale { font-size: 11px; color: var(--text-secondary); letter-spacing: 0.05em; }

    /* Artisans grid */
    .artisans-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
    .artisan-card {
      display: flex; gap: 24px; background: white;
      border: 1px solid var(--border); padding: 28px;
      transition: box-shadow 0.3s;
      &:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.06); }
    }
    .artisan-avatar {
      width: 64px; height: 64px; border-radius: 50%;
      background: var(--gold); color: white;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Cormorant Garamond', serif; font-size: 28px;
      font-weight: 600; flex-shrink: 0;
    }
    .artisan-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
      h3 { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 600; } }
    .verified-icon { color: var(--gold); font-size: 18px; width: 18px; height: 18px; }
    .artisan-location {
      display: flex; align-items: center; gap: 4px;
      font-size: 11px; color: var(--text-secondary); letter-spacing: 0.05em; margin-bottom: 10px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .artisan-bio { font-size: 13px; color: var(--text-secondary); line-height: 1.7;
                   margin-bottom: 14px; }
    .artisan-stats {
      display: flex; gap: 20px; margin-bottom: 14px;
      padding-top: 14px; border-top: 1px solid var(--border);
    }
    .stat { text-align: center;
      .stat-value { display: block; font-size: 16px; font-weight: 600; color: var(--black); }
      .stat-label { font-size: 10px; color: var(--text-secondary); letter-spacing: 0.1em; }
    }
    .specialties { display: flex; gap: 6px; flex-wrap: wrap; }
    .tag {
      font-size: 10px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase;
      border: 1px solid var(--border); padding: 3px 10px; color: var(--text-secondary);
    }

    /* Loading skeletons */
    .loading-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
    .skeleton-card {
      height: 380px; background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
      background-size: 400% 100%; animation: shimmer 1.4s ease infinite;
    }
    @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

    /* Merchant CTA */
    .merchant-cta {
      background: var(--black);
      padding: 80px 32px;
    }
    .cta-inner {
      display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center;
    }
    .cta-eyebrow {
      display: block; font-size: 10px; font-weight: 600; letter-spacing: 0.3em;
      text-transform: uppercase; color: var(--gold); margin-bottom: 16px;
    }
    .cta-text {
      h2 { font-family: 'Cormorant Garamond', serif; font-size: 38px;
           font-weight: 500; color: var(--cream); margin-bottom: 16px; line-height: 1.2; }
      p { font-size: 14px; color: rgba(245,240,232,0.6); line-height: 1.8; margin-bottom: 28px; }
    }
    .cta-btn {
      display: inline-block; background: var(--gold-dark); color: white;
      padding: 14px 32px; font-size: 11px; font-weight: 600; letter-spacing: 0.2em;
      text-transform: uppercase; text-decoration: none;
      transition: background 0.2s;
      &:hover { background: var(--gold); }
    }
    .cta-visual {
      display: flex; flex-direction: column; gap: 16px;
    }
    .visual-block {
      display: flex; align-items: center; gap: 16px;
      border: 1px solid rgba(255,255,255,0.08); padding: 20px 24px;
      mat-icon { color: var(--gold); }
      span { font-size: 13px; color: rgba(245,240,232,0.7); letter-spacing: 0.05em; }
    }
  `]
})
export class MarketplaceComponent implements OnInit {
  private marketplaceService = inject(MarketplaceService);

  products = signal<MarketplaceProduct[]>([]);
  artisans = signal<ArtisanProfile[]>([]);
  loading = signal(true);
  activeTab = signal<'products' | 'artisans'>('products');
  searchQuery = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.marketplaceService.getMarketplaceProducts().subscribe({
      next: (data: any) => {
        this.products.set(data.content ?? data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });

    this.marketplaceService.getArtisans().subscribe({
      next: (data: any) => this.artisans.set(data.content ?? data ?? []),
      error: () => {}
    });
  }

  search(): void {
    if (!this.searchQuery.trim()) return;
    this.loading.set(true);
    this.marketplaceService.search(this.searchQuery).subscribe({
      next: (data: any) => {
        this.products.set(data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
