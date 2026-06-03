import { createReducer } from '@ngrx/store';

export interface OrderState {
  orders: any[];
  selectedOrder: any | null;
  loading: boolean;
  error: string | null;
}

const initialState: OrderState = {
  orders: [],
  selectedOrder: null,
  loading: false,
  error: null
};

export const orderReducer = createReducer(initialState);
