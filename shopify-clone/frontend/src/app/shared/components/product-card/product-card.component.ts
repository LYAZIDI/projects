import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { Product } from '../../../core/services/product.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  template: `
    <a class="product-card" [routerLink]="['/products', product.slug]">
      <div class="product-image">
        <img [src]="product.images[0]?.url || 'assets/placeholder.png'" [alt]="product.title">
        <div class="product-overlay">
          <span class="quick-view">VOIR LE PRODUIT</span>
        </div>
        @if (product.compareAtPrice) {
          <span class="badge-sale">SOLDE</span>
        }
      </div>
      <div class="product-info">
        <p class="product-vendor">{{ product.vendor }}</p>
        <h3 class="product-title">{{ product.title }}</h3>
        <div class="product-price">
          <span class="price-current">{{ product.price | currency:'EUR':'symbol':'1.2-2' }}</span>
          @if (product.compareAtPrice) {
            <span class="price-original">{{ product.compareAtPrice | currency:'EUR':'symbol':'1.2-2' }}</span>
          }
        </div>
      </div>
    </a>
  `,
  styles: [`
    .product-card {
      display: block;
      text-decoration: none;
      color: inherit;
      group: true;
    }
    .product-image {
      position: relative;
      overflow: hidden;
      background: #F0EBE3;
      aspect-ratio: 3/4;
      margin-bottom: 16px;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s ease;
      }
      &:hover img { transform: scale(1.05); }
      &:hover .product-overlay { opacity: 1; }
    }
    .product-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .quick-view {
      color: var(--cream);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.25em;
      border: 1px solid rgba(245,240,232,0.6);
      padding: 10px 20px;
      backdrop-filter: blur(4px);
    }
    .badge-sale {
      position: absolute;
      top: 12px;
      left: 12px;
      background: var(--burgundy);
      color: white;
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.2em;
      padding: 4px 8px;
    }
    .product-info {
      padding: 0 4px;
    }
    .product-vendor {
      font-size: 10px;
      letter-spacing: 0.2em;
      color: var(--gold-dark);
      text-transform: uppercase;
      font-weight: 500;
      margin-bottom: 4px;
    }
    .product-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 18px;
      font-weight: 500;
      color: var(--black);
      margin-bottom: 8px;
      letter-spacing: 0.02em;
    }
    .product-price {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .price-current {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
      letter-spacing: 0.05em;
    }
    .price-original {
      font-size: 12px;
      color: var(--text-light);
      text-decoration: line-through;
    }
  `]
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
}
