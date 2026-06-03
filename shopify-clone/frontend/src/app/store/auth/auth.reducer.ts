import { createReducer, on } from '@ngrx/store';
import { AuthActions } from './auth.actions';
import { AuthResponse } from '../../core/services/auth.service';

export interface AuthState {
  user: AuthResponse | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null
};

export const authReducer = createReducer(
  initialState,

  on(AuthActions.login, AuthActions.register, state => ({ ...state, loading: true, error: null })),

  on(AuthActions.loginSuccess, AuthActions.registerSuccess, (state, { response }) => ({
    ...state, user: response, loading: false, error: null
  })),

  on(AuthActions.loginFailure, AuthActions.registerFailure, (state, { error }) => ({
    ...state, loading: false, error
  })),

  on(AuthActions.logout, () => initialState)
);
