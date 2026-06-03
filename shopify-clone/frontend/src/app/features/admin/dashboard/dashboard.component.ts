import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container" style="padding: 32px 24px">
      <h1>Admin Dashboard</h1>
      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-icon>inventory_2</mat-icon>
          <div>
            <p class="stat-label">Products</p>
            <a mat-button routerLink="/admin/products">Manage Products</a>
          </div>
        </mat-card>
        <mat-card class="stat-card">
          <mat-icon>receipt_long</mat-icon>
          <div>
            <p class="stat-label">Orders</p>
            <a mat-button routerLink="/admin/orders">Manage Orders</a>
          </div>
        </mat-card>
        <mat-card class="stat-card">
          <mat-icon>people</mat-icon>
          <div>
            <p class="stat-label">Customers</p>
            <a mat-button routerLink="/admin/customers">Manage Customers</a>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 24px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 24px; }
    .stat-card { padding: 24px; display: flex; align-items: center; gap: 16px;
      mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--primary); }
      .stat-label { font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
    }
  `]
})
export class DashboardComponent {}
