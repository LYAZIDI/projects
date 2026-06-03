import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="success-page">
      <mat-icon class="icon">check_circle</mat-icon>
      <h1>Payment Successful!</h1>
      <p>Thank you for your order. You will receive a confirmation email shortly.</p>
      <div class="actions">
        <a mat-raised-button color="primary" routerLink="/account/orders">View My Orders</a>
        <a mat-stroked-button routerLink="/products">Continue Shopping</a>
      </div>
    </div>
  `,
  styles: [`
    .success-page {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 70vh; gap: 16px; text-align: center; padding: 24px;
    }
    .icon { font-size: 80px; width: 80px; height: 80px; color: #50b83c; }
    h1 { font-size: 32px; font-weight: 700; }
    p { color: var(--text-secondary); font-size: 16px; }
    .actions { display: flex; gap: 12px; margin-top: 8px; }
  `]
})
export class CheckoutSuccessComponent {}
