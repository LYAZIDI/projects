import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import {
  loadProducts, loadProductsSuccess, loadProductsFailure,
  loadProduct, loadProductSuccess, loadProductFailure
} from './product.reducer';

@Injectable()
export class ProductEffects {
  private actions$ = inject(Actions);
  private productService = inject(ProductService);

  loadProducts$ = createEffect(() => this.actions$.pipe(
    ofType(loadProducts),
    switchMap(({ page, size }) =>
      this.productService.getProducts(page, size).pipe(
        map(data => loadProductsSuccess({ data })),
        catchError(err => of(loadProductsFailure({ error: err.message })))
      )
    )
  ));

  loadProduct$ = createEffect(() => this.actions$.pipe(
    ofType(loadProduct),
    switchMap(({ slug }) =>
      this.productService.getProductBySlug(slug).pipe(
        map(product => loadProductSuccess({ product })),
        catchError(err => of(loadProductFailure({ error: err.message })))
      )
    )
  ));
}
