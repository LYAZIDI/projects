import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.parseUrl('/login');
};

/**
 * Permission guard factory.
 *
 * Usage in routes:
 * ```ts
 * canActivate: [authGuard, permissionGuard('PERM_WORKFLOW_READ')]
 * ```
 */
export const permissionGuard = (perm: string): CanActivateFn => () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.hasPermission(perm)) return true;
  return router.parseUrl('/forbidden');
};
