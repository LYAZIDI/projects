import { Component, inject, OnInit, Input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Store } from '@ngrx/store';
import { loadProduct } from '../../../store/product/product.reducer';
import { CartService } from '../../../core/services/cart.service';
import { Product, ProductVariant } from '../../../core/services/product.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CurrencyPipe, MatButtonModule, MatSelectModule, MatSnackBarModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container product-detail">
      @if (product) {
        <div class="product-layout">
          <div class="product-images">
            <img [src]="selectedImage || 'assets/placeholder.png'" [alt]="product.title" class="main-image">
            <div class="thumbnails">
              @for (img of product.images; track img.id) {
                <img [src]="img.url" [alt]="img.altText"
                     (click)="selectedImage = img.url"
                     [class.active]="selectedImage === img.url">
              }
            </div>
          </div>

          <div class="product-info">
            <p class="vendor">{{ product.vendor }}</p>
            <h1>{{ product.title }}</h1>

            <div class="price-row">
              <span class="price">{{ selectedVariant?.price ?? product.price | currency }}</span>
              @if (product.compareAtPrice) {
                <span class="compare">{{ product.compareAtPrice | currency }}</span>
              }
            </div>

            @if (product.variants.length > 1) {
              <mat-form-field appearance="outline">
                <mat-label>Variant</mat-label>
                <mat-select [(value)]="selectedVariant">
                  @for (v of product.variants; track v.id) {
                    <mat-option [value]="v">{{ v.title }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }

            <button mat-raised-button color="primary" class="add-to-cart"
                    (click)="addToCart()">
              Add to Cart
            </button>

            <div class="description" [innerHTML]="product.description"></div>
          </div>
        </div>
      } @else {
        <div class="loading"><mat-spinner diameter="48" /></div>
      }
    </div>
  `,
  styles: [`
    .product-detail { padding: 32px 24px; }
    .product-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
    .main-image { width: 100%; border-radius: 8px; }
    .thumbnails { display: flex; gap: 8px; margin-top: 8px; }
    .thumbnails img { width: 72px; height: 72px; object-fit: cover; border-radius: 4px; cursor: pointer; border: 2px solid transparent; }
    .thumbnails img.active { border-color: var(--primary); }
    .vendor { color: var(--text-secondary); text-transform: uppercase; font-size: 12px; margin-bottom: 8px; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 16px; }
    .price-row { display: flex; gap: 12px; align-items: center; margin-bottom: 24px; }
    .price { font-size: 24px; font-weight: 600; color: var(--primary); }
    .compare { font-size: 18px; text-decoration: line-through; color: var(--text-secondary); }
    .add-to-cart { width: 100%; margin: 16px 0 24px; padding: 12px; font-size: 16px; }
    .description { color: var(--text-secondary); line-height: 1.6; }
    .loading { display: flex; justify-content: center; padding: 80px; }
  `]
})
export class ProductDetailComponent implements OnInit {
  @Input() slug!: string;

  private store = inject(Store);
  private cartService = inject(CartService);
  private snackBar = inject(MatSnackBar);

  product: Product | null = null;
  selectedVariant: ProductVariant | null = null;
  selectedImage: string | null = null;

  ngOnInit(): void {
    this.store.dispatch(loadProduct({ slug: this.slug }));
    this.store.select(s => (s as any)['product'].selectedProduct).subscribe((p: Product) => {
      if (p) {
        this.product = p;
        this.selectedImage = p.images[0]?.url ?? null;
        this.selectedVariant = p.variants[0] ?? null;
      }
    });
  }

  addToCart(): void {
    if (this.product) {
      this.cartService.addItem(this.product, this.selectedVariant ?? undefined);
      this.snackBar.open('Added to cart!', 'View Cart', { duration: 3000 });
    }
  }
}
