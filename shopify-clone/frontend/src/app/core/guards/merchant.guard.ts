import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const merchantGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.getUser();
  if (user && (user.role === 'MERCHANT' || user.role === 'ADMIN')) return true;
  router.navigate(['/auth/login']);
  return false;
};
