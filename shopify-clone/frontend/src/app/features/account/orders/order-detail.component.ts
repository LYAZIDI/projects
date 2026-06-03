import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import {
  OrderTrackingService, Order, OrderStatus,
  ORDER_STATUS_STEPS, ORDER_STATUS_LABELS, ORDER_STATUS_ICONS
} from '../../../core/services/order-tracking.service';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    RouterLink, DatePipe, CurrencyPipe,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatDividerModule
  ],
  template: `
    <div class="page-container order-detail-page">
      <div class="back-link">
        <a mat-button routerLink="/account/orders">
          <mat-icon>arrow_back</mat-icon> Back to Orders
        </a>
      </div>

      @if (loading()) {
        <div class="loading"><mat-spinner diameter="48" /></div>
      } @else if (order()) {
        <div class="order-header">
          <div>
            <h1>Order {{ order()!.orderNumber }}</h1>
            <p class="order-date">Placed on {{ order()!.createdAt | date:'MMMM d, yyyy, h:mm a' }}</p>
          </div>
          <span [class]="'status-badge status-' + order()!.status.toLowerCase()">
            <mat-icon>{{ getStatusIcon(order()!.status) }}</mat-icon>
            {{ getStatusLabel(order()!.status) }}
          </span>
        </div>

        <!-- STATUS TIMELINE -->
        @if (!isCancelledOrRefunded(order()!.status)) {
          <div class="card timeline-card">
            <h2>Order Status</h2>
            <div class="timeline">
              @for (step of statusSteps; track step; let i = $index) {
                <div class="timeline-step" [class.completed]="isCompleted(step)" [class.active]="isActive(step)">
                  <div class="step-icon">
                    <mat-icon>{{ getStatusIcon(step) }}</mat-icon>
                  </div>
                  <div class="step-line" [class.filled]="isCompleted(step)"></div>
                  <div class="step-label">{{ getStatusLabel(step) }}</div>
                </div>
              }
            </div>
          </div>
        }

        <div class="detail-layout">

          <!-- ORDER ITEMS -->
          <div class="card items-card">
            <h2>Items Ordered</h2>
            <mat-divider style="margin: 12px 0" />
            @for (item of order()!.items; track item.id) {
              <div class="order-item">
                <div class="item-info">
                  <p class="item-title">{{ item.productTitle }}</p>
                  @if (item.variantTitle) {
                    <p class="item-variant">{{ item.variantTitle }}</p>
                  }
                  <p class="item-qty">Qty: {{ item.quantity }}</p>
                </div>
                <div class="item-prices">
                  <p class="item-unit">{{ item.price | currency }}</p>
                  <p class="item-total">{{ item.total | currency }}</p>
                </div>
              </div>
              <mat-divider />
            }

            <div class="order-totals">
              <div class="total-row">
                <span>Subtotal</span>
                <span>{{ order()!.subtotal | currency:order()!.currency }}</span>
              </div>
              <div class="total-row">
                <span>Tax</span>
                <span>{{ order()!.taxTotal | currency:order()!.currency }}</span>
              </div>
              <div class="total-row">
                <span>Shipping</span>
                <span>{{ order()!.shippingTotal > 0 ? (order()!.shippingTotal | currency) : 'Free' }}</span>
              </div>
              @if (order()!.discountTotal > 0) {
                <div class="total-row discount">
                  <span>Discount</span>
                  <span>-{{ order()!.discountTotal | currency:order()!.currency }}</span>
                </div>
              }
              <mat-divider style="margin: 8px 0" />
              <div class="total-row grand-total">
                <span>Total</span>
                <span>{{ order()!.total | currency:order()!.currency }}</span>
              </div>
            </div>
          </div>

          <!-- SHIPPING INFO -->
          <div class="side-cards">
            <div class="card">
              <h2>Shipping Address</h2>
              <mat-divider style="margin: 12px 0" />
              <address>
                <p>{{ order()!.shippingFirstName }} {{ order()!.shippingLastName }}</p>
                <p>{{ order()!.shippingAddress1 }}</p>
                @if (order()!.shippingAddress2) {
                  <p>{{ order()!.shippingAddress2 }}</p>
                }
                <p>{{ order()!.shippingCity }}, {{ order()!.shippingState }} {{ order()!.shippingZip }}</p>
                <p>{{ order()!.shippingCountry }}</p>
              </address>
            </div>

            <div class="card">
              <h2>Payment</h2>
              <mat-divider style="margin: 12px 0" />
              <div class="payment-info">
                <span [class]="'payment-badge payment-' + order()!.paymentStatus.toLowerCase()">
                  {{ order()!.paymentStatus }}
                </span>
                <p class="payment-total">{{ order()!.total | currency:order()!.currency }}</p>
              </div>
            </div>
          </div>

        </div>
      } @else {
        <div class="not-found">
          <mat-icon>search_off</mat-icon>
          <p>Order not found.</p>
          <a mat-raised-button color="primary" routerLink="/account/orders">Back to Orders</a>
        </div>
      }
    </div>
  `,
  styles: [`
    .order-detail-page { padding: 24px; max-width: 1000px; }
    .back-link { margin-bottom: 16px; }
    .order-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
      h1 { font-size: 24px; font-weight: 700; }
      .order-date { color: var(--text-secondary); margin-top: 4px; }
    }
    /* Status badge */
    .status-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 500;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    .status-pending    { background: #fff3cd; color: #856404; }
    .status-confirmed  { background: #d1ecf1; color: #0c5460; }
    .status-processing { background: #cce5ff; color: #004085; }
    .status-shipped    { background: #d4edda; color: #155724; }
    .status-delivered  { background: #d4edda; color: #155724; }
    .status-cancelled  { background: #f8d7da; color: #721c24; }
    .status-refunded   { background: #e2e3e5; color: #383d41; }

    /* Timeline */
    .timeline-card { padding: 24px; margin-bottom: 24px; h2 { font-size: 18px; font-weight: 600; margin-bottom: 24px; } }
    .timeline {
      display: flex; align-items: flex-start; justify-content: space-between; position: relative;
    }
    .timeline-step {
      display: flex; flex-direction: column; align-items: center; flex: 1; position: relative;
      .step-icon {
        width: 44px; height: 44px; border-radius: 50%; background: var(--border);
        display: flex; align-items: center; justify-content: center; z-index: 1;
        mat-icon { font-size: 20px; width: 20px; height: 20px; color: white; }
      }
      .step-line {
        position: absolute; top: 22px; left: 50%; width: 100%; height: 3px;
        background: var(--border); z-index: 0;
        &.filled { background: var(--primary); }
      }
      &:last-child .step-line { display: none; }
      .step-label { font-size: 12px; text-align: center; margin-top: 8px; color: var(--text-secondary); font-weight: 500; }
      &.completed .step-icon { background: var(--primary); }
      &.active .step-icon { background: var(--primary); box-shadow: 0 0 0 4px rgba(92,106,196,0.2); }
      &.completed .step-label, &.active .step-label { color: var(--primary); font-weight: 600; }
    }

    /* Layout */
    .detail-layout { display: grid; grid-template-columns: 1fr 280px; gap: 24px; align-items: start; }
    .items-card { padding: 24px; h2 { font-size: 18px; font-weight: 600; } }
    .order-item {
      display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 0;
      .item-title { font-weight: 500; }
      .item-variant, .item-qty { color: var(--text-secondary); font-size: 13px; margin-top: 2px; }
      .item-prices { text-align: right; .item-unit { color: var(--text-secondary); font-size: 13px; } .item-total { font-weight: 600; } }
    }
    .order-totals { padding-top: 16px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; color: var(--text-secondary); }
    .total-row.discount { color: var(--success); }
    .total-row.grand-total { font-size: 16px; font-weight: 700; color: var(--text-primary); }

    /* Side cards */
    .side-cards { display: flex; flex-direction: column; gap: 16px; }
    .side-cards .card { padding: 20px; h2 { font-size: 16px; font-weight: 600; } }
    address { font-style: normal; color: var(--text-secondary); line-height: 1.8; }
    .payment-info { display: flex; flex-direction: column; gap: 8px; }
    .payment-badge {
      display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: 500;
      background: #d4edda; color: #155724;
    }
    .payment-total { font-size: 18px; font-weight: 700; }
    .loading { display: flex; justify-content: center; padding: 80px; }
    .not-found { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 80px; text-align: center;
      mat-icon { font-size: 64px; width: 64px; height: 64px; color: var(--border); }
    }
  `]
})
export class OrderDetailComponent implements OnInit {
  @Input() orderNumber!: string;

  private orderService = inject(OrderTrackingService);

  order = signal<Order | null>(null);
  loading = signal(true);

  readonly statusSteps = ORDER_STATUS_STEPS;

  ngOnInit(): void {
    this.orderService.getOrder(this.orderNumber).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getStatusLabel(status: OrderStatus): string {
    return ORDER_STATUS_LABELS[status];
  }

  getStatusIcon(status: OrderStatus): string {
    return ORDER_STATUS_ICONS[status];
  }

  isCompleted(step: OrderStatus): boolean {
    const order = this.order();
    if (!order) return false;
    const currentIndex = ORDER_STATUS_STEPS.indexOf(order.status);
    const stepIndex = ORDER_STATUS_STEPS.indexOf(step);
    return stepIndex < currentIndex;
  }

  isActive(step: OrderStatus): boolean {
    return this.order()?.status === step;
  }

  isCancelledOrRefunded(status: OrderStatus): boolean {
    return status === 'CANCELLED' || status === 'REFUNDED';
  }
}
