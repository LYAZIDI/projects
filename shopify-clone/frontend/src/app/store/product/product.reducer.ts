import { createReducer, on } from '@ngrx/store';
import { createAction, props } from '@ngrx/store';
import { Product, PageResponse } from '../../core/services/product.service';

// Actions
export const loadProducts = createAction('[Product] Load Products', props<{ page: number; size: number }>());
export const loadProductsSuccess = createAction('[Product] Load Products Success', props<{ data: PageResponse<Product> }>());
export const loadProductsFailure = createAction('[Product] Load Products Failure', props<{ error: string }>());
export const loadProduct = createAction('[Product] Load Product', props<{ slug: string }>());
export const loadProductSuccess = createAction('[Product] Load Product Success', props<{ product: Product }>());
export const loadProductFailure = createAction('[Product] Load Product Failure', props<{ error: string }>());

export interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  totalElements: number;
  totalPages: number;
  currentPage: number;
  loading: boolean;
  error: string | null;
}

const initialState: ProductState = {
  products: [],
  selectedProduct: null,
  totalElements: 0,
  totalPages: 0,
  currentPage: 0,
  loading: false,
  error: null
};

export const productReducer = createReducer(
  initialState,
  on(loadProducts, loadProduct, state => ({ ...state, loading: true, error: null })),
  on(loadProductsSuccess, (state, { data }) => ({
    ...state, products: data.content, totalElements: data.totalElements,
    totalPages: data.totalPages, currentPage: data.page, loading: false
  })),
  on(loadProductSuccess, (state, { product }) => ({ ...state, selectedProduct: product, loading: false })),
  on(loadProductsFailure, loadProductFailure, (state, { error }) => ({ ...state, loading: false, error }))
);
