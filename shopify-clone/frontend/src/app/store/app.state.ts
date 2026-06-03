import { ActionReducerMap } from '@ngrx/store';
import { authReducer, AuthState } from './auth/auth.reducer';
import { productReducer, ProductState } from './product/product.reducer';
import { cartReducer, CartState } from './cart/cart.reducer';
import { orderReducer, OrderState } from './order/order.reducer';

export interface AppState {
  auth: AuthState;
  product: ProductState;
  cart: CartState;
  order: OrderState;
}

export const reducers: ActionReducerMap<AppState> = {
  auth: authReducer,
  product: productReducer,
  cart: cartReducer,
  order: orderReducer
};
