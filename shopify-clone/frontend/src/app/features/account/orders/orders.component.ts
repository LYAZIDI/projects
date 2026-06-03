import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import {
  OrderTrackingService, Order, OrderStatus,
  ORDER_STATUS_LABELS, ORDER_STATUS_ICONS
} from '../../../core/services/order-tracking.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    RouterLink, DatePipe, CurrencyPipe,
    MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatPaginatorModule
  ],
  template: `
    <div class="page-container orders-page">
      <div class="section-header">
        <h1>My Orders</h1>
      </div>

      @if (loading()) {
        <div class="loading"><mat-spinner diameter="48" /></div>
      } @else if (orders().length === 0) {
        <div class="empty-state">
          <mat-icon>receipt_long</mat-icon>
          <h2>No orders yet</h2>
          <p>Once you place an order, it will appear here.</p>
          <a mat-raised-button color="primary" routerLink="/products">Start Shopping</a>
        </div>
      } @else {
        <div class="orders-list">
          @for (order of orders(); track order.id) {
            <div class="order-card card">
              <div class="order-header">
                <div class="order-meta">
                  <span class="order-number">{{ order.orderNumber }}</span>
                  <span class="order-date">{{ order.createdAt | date:'MMM d, yyyy' }}</span>
                </div>
                <div class="order-right">
                  <span [class]="'status-badge status-' + order.status.toLowerCase()">
                    <mat-icon>{{ getStatusIcon(order.status) }}</mat-icon>
                    {{ getStatusLabel(order.status) }}
                  </span>
                  <span class="order-total">{{ order.total | currency:order.currency }}</span>
                </div>
              </div>

              <div class="order-items">
                @for (item of order.items.slice(0, 3); track item.id) {
                  <div class="order-item">
                    <span class="item-qty">{{ item.quantity }}×</span>
                    <span class="item-title">{{ item.productTitle }}</span>
                    @if (item.variantTitle) {
                      <span class="item-variant">— {{ item.variantTitle }}</span>
                    }
                    <span class="item-price">{{ item.total | currency }}</span>
                  </div>
                }
                @if (order.items.length > 3) {
                  <p class="more-items">+{{ order.items.length - 3 }} more items</p>
                }
              </div>

              <div class="order-footer">
                <a mat-stroked-button [routerLink]="['/account/orders', order.orderNumber]">
                  <mat-icon>visibility</mat-icon> Track Order
                </a>
              </div>
            </div>
          }
        </div>

        <mat-paginator
          [length]="totalElements()"
          [pageSize]="10"
          (page)="onPage($event)" />
      }
    </div>
  `,
  styles: [`
    .orders-page { padding: 32px 24px; max-width: 900px; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 24px; }
    .loading { display: flex; justify-content: center; padding: 80px; }
    .empty-state {
      display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 80px; text-align: center;
      mat-icon { font-size: 64px; width: 64px; height: 64px; color: var(--border); }
      h2 { font-size: 20px; font-weight: 600; }
      p { color: var(--text-secondary); }
    }
    .orders-list { display: flex; flex-direction: column; gap: 16px; }
    .order-card { padding: 20px; }
    .order-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
      flex-wrap: wrap; gap: 8px;
    }
    .order-meta { display: flex; flex-direction: column; gap: 4px; }
    .order-number { font-weight: 600; font-size: 15px; }
    .order-date { color: var(--text-secondary); font-size: 13px; }
    .order-right { display: flex; align-items: center; gap: 16px; }
    .order-total { font-weight: 700; font-size: 16px; }
    .status-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 20px; font-size: 13px; font-weight: 500;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .status-pending    { background: #fff3cd; color: #856404; }
    .status-confirmed  { background: #d1ecf1; color: #0c5460; }
    .status-processing { background: #cce5ff; color: #004085; }
    .status-shipped    { background: #d4edda; color: #155724; }
    .status-delivered  { background: #d4edda; color: #155724; }
    .status-cancelled  { background: #f8d7da; color: #721c24; }
    .status-refunded   { background: #e2e3e5; color: #383d41; }
    .order-items { border-top: 1px solid var(--border); padding-top: 12px; margin-bottom: 12px; }
    .order-item {
      display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 14px;
      .item-qty { font-weight: 600; color: var(--text-secondary); min-width: 24px; }
      .item-title { flex: 1; }
      .item-variant { color: var(--text-secondary); font-size: 13px; }
      .item-price { font-weight: 500; }
    }
    .more-items { color: var(--text-secondary); font-size: 13px; margin-top: 4px; }
    .order-footer { display: flex; justify-content: flex-end; border-top: 1px solid var(--border); padding-top: 12px; }
  `]
})
export class OrdersComponent implements OnInit {
  private orderService = inject(OrderTrackingService);

  orders = signal<Order[]>([]);
  totalElements = signal(0);
  loading = signal(true);

  ngOnInit(): void {
    this.loadOrders(0);
  }

  loadOrders(page: number): void {
    this.loading.set(true);
    this.orderService.getMyOrders(page).subscribe({
      next: (res) => {
        this.orders.set(res.content);
        this.totalElements.set(res.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onPage(event: PageEvent): void {
    this.loadOrders(event.pageIndex);
  }

  getStatusLabel(status: OrderStatus): string {
    return ORDER_STATUS_LABELS[status];
  }

  getStatusIcon(status: OrderStatus): string {
    return ORDER_STATUS_ICONS[status];
  }
}
