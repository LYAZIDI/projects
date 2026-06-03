import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Store } from '@ngrx/store';
import { map } from 'rxjs';
import { loadProducts, ProductState } from '../../../store/product/product.reducer';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [AsyncPipe, MatProgressSpinnerModule, MatPaginatorModule, ProductCardComponent],
  template: `
    <div class="page-container" style="padding: 32px 24px">
      <h1>All Products</h1>

      @if (loading$ | async) {
        <div class="loading">
          <mat-spinner diameter="48" />
        </div>
      } @else {
        <div class="products-grid">
          @for (product of products$ | async; track product.id) {
            <app-product-card [product]="product" />
          } @empty {
            <p class="empty">No products found.</p>
          }
        </div>

        <mat-paginator
          [length]="totalElements$ | async"
          [pageSize]="12"
          [pageSizeOptions]="[12, 24, 48]"
          (page)="onPage($event)" />
      }
    </div>
  `,
  styles: [`
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 24px; }
    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px; }
    .loading { display: flex; justify-content: center; padding: 80px; }
    .empty { color: var(--text-secondary); text-align: center; padding: 80px; grid-column: 1/-1; }
  `]
})
export class ProductListComponent implements OnInit {
  private store = inject(Store);

  products$ = this.store.select(s => (s as any)['product'] as ProductState).pipe(map(s => s.products));
  loading$ = this.store.select(s => (s as any)['product'] as ProductState).pipe(map(s => s.loading));
  totalElements$ = this.store.select(s => (s as any)['product'] as ProductState).pipe(map(s => s.totalElements));

  ngOnInit(): void {
    this.store.dispatch(loadProducts({ page: 0, size: 12 }));
  }

  onPage(event: PageEvent): void {
    this.store.dispatch(loadProducts({ page: event.pageIndex, size: event.pageSize }));
  }
}
