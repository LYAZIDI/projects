import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-products-admin',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTableModule],
  template: `
    <div class="page-container" style="padding: 32px 24px">
      <div class="section-header">
        <h1>Products</h1>
        <button mat-raised-button color="primary">
          <mat-icon>add</mat-icon> Add Product
        </button>
      </div>
      <p style="color: var(--text-secondary)">
        Product management CRUD will be implemented here.
      </p>
    </div>
  `,
  styles: [`h1 { font-size: 28px; font-weight: 700; }`]
})
export class ProductsAdminComponent {}
