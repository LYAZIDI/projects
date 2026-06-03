import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Router } from '@angular/router';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { AuthActions } from './auth.actions';
import { AuthService, AuthResponse } from '../../core/services/auth.service';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private router = inject(Router);

  login$ = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.login),
    switchMap(({ request }) =>
      this.authService.login(request).pipe(
        map(response => AuthActions.loginSuccess({ response })),
        catchError(err => of(AuthActions.loginFailure({ error: err.error?.message ?? 'Login failed' })))
      )
    )
  ));

  loginSuccess$ = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.loginSuccess),
    tap(({ response }) => this.navigateByRole(response))
  ), { dispatch: false });

  register$ = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.register),
    switchMap(({ request }) =>
      this.authService.register(request).pipe(
        map(response => AuthActions.registerSuccess({ response })),
        catchError(err => of(AuthActions.registerFailure({ error: err.error?.message ?? 'Registration failed' })))
      )
    )
  ));

  registerSuccess$ = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.registerSuccess),
    tap(({ response }) => this.navigateByRole(response))
  ), { dispatch: false });

  logout$ = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.logout),
    tap(() => {
      this.authService.logout();
      this.router.navigate(['/auth/login']);
    })
  ), { dispatch: false });

  private navigateByRole(response: AuthResponse): void {
    switch (response.role) {
      case 'ARTISAN':
        this.router.navigate(['/artisan/dashboard']);
        break;
      case 'MERCHANT':
        this.router.navigate(['/merchant/dashboard']);
        break;
      case 'ADMIN':
        this.router.navigate(['/admin']);
        break;
      default:
        this.router.navigate(['/']);
    }
  }
}
