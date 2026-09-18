import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isLoggedIn']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: { createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue({} as UrlTree) } }
      ]
    });

    router = TestBed.inject(Router);
  });

  const executeGuard = () =>
    TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

  it('should allow activation when the user is logged in', () => {
    authServiceSpy.isLoggedIn.and.returnValue(true);

    const result = executeGuard();

    expect(result).toBeTrue();
  });

  it('should redirect to /auth/login when the user is not logged in', () => {
    authServiceSpy.isLoggedIn.and.returnValue(false);

    const result = executeGuard();

    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
    expect(result).not.toBeTrue();
  });
});
