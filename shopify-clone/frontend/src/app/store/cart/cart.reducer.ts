import { createReducer } from '@ngrx/store';
import { CartItem } from '../../core/services/cart.service';

export interface CartState {
  items: CartItem[];
}

const initialState: CartState = { items: [] };

// Cart state is managed via CartService signals for real-time reactivity.
// This reducer is a placeholder for NgRx integration if needed.
export const cartReducer = createReducer(initialState);
