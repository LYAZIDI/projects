import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container cart-page">
      <h1>Shopping Cart</h1>

      @if (cartService.cartItems().length === 0) {
        <div class="empty-cart">
          <mat-icon>shopping_cart</mat-icon>
          <p>Your cart is empty</p>
          <a mat-raised-button color="primary" routerLink="/products">Start Shopping</a>
        </div>
      } @else {
        <div class="cart-layout">
          <div class="cart-items">
            @for (item of cartService.cartItems(); track item.productId) {
              <div class="cart-item card">
                <img [src]="item.imageUrl || 'assets/placeholder.png'" [alt]="item.title">
                <div class="item-info">
                  <h3>{{ item.title }}</h3>
                  @if (item.variantTitle) { <p class="variant">{{ item.variantTitle }}</p> }
                  <p class="price">{{ item.price | currency }}</p>
                </div>
                <div class="item-controls">
                  <button mat-icon-button (click)="decrease(item)"><mat-icon>remove</mat-icon></button>
                  <span>{{ item.quantity }}</span>
                  <button mat-icon-button (click)="increase(item)"><mat-icon>add</mat-icon></button>
                </div>
                <span class="item-total">{{ item.price * item.quantity | currency }}</span>
                <button mat-icon-button color="warn" (click)="remove(item)"><mat-icon>delete</mat-icon></button>
              </div>
            }
          </div>

          <div class="cart-summary card">
            <h2>Summary</h2>
            <div class="summary-row">
              <span>Subtotal</span>
              <span>{{ cartService.subtotal() | currency }}</span>
            </div>
            <div class="summary-row">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            <hr>
            <div class="summary-row total">
              <span>Total</span>
              <span>{{ cartService.subtotal() | currency }}</span>
            </div>
            <a mat-raised-button color="primary" routerLink="/checkout" style="width:100%; margin-top:16px">
              Proceed to Checkout
            </a>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .cart-page { padding: 32px 24px; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 24px; }
    .empty-cart { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 80px;
      mat-icon { font-size: 64px; width: 64px; height: 64px; color: var(--border); }
      p { font-size: 18px; color: var(--text-secondary); }
    }
    .cart-layout { display: grid; grid-template-columns: 1fr 320px; gap: 24px; align-items: start; }
    .cart-item { display: flex; align-items: center; gap: 16px; margin-bottom: 16px;
      img { width: 80px; height: 80px; object-fit: cover; border-radius: 4px; }
      .item-info { flex: 1; h3 { font-weight: 500; } .variant, .price { color: var(--text-secondary); font-size: 13px; } }
      .item-controls { display: flex; align-items: center; gap: 4px; }
      .item-total { font-weight: 600; min-width: 80px; text-align: right; }
    }
    .cart-summary { h2 { font-size: 18px; font-weight: 600; margin-bottom: 16px; } }
    .summary-row { display: flex; justify-content: space-between; margin-bottom: 12px; color: var(--text-secondary); }
    .summary-row.total { font-weight: 700; font-size: 16px; color: var(--text-primary); margin-top: 12px; }
    hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }
  `]
})
export class CartComponent {
  cartService = inject(CartService);

  increase(item: any): void {
    this.cartService.updateQuantity(item.productId, item.variantId, item.quantity + 1);
  }

  decrease(item: any): void {
    this.cartService.updateQuantity(item.productId, item.variantId, item.quantity - 1);
  }

  remove(item: any): void {
    this.cartService.removeItem(item.productId, item.variantId);
  }
}
