import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService, AuthResponse } from '../services/auth.service';

describe('adminGuard', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  const buildUser = (role: string): AuthResponse => ({
    accessToken: 't', refreshToken: 'r', tokenType: 'Bearer',
    userId: 1, email: 'a@b.com', firstName: 'A', lastName: 'B', role
  });

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getUser']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: { createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue({} as UrlTree) } }
      ]
    });

    router = TestBed.inject(Router);
  });

  const executeGuard = () =>
    TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));

  it('should allow activation when the user has the ADMIN role', () => {
    authServiceSpy.getUser.and.returnValue(buildUser('ADMIN'));

    const result = executeGuard();

    expect(result).toBeTrue();
  });

  it('should redirect to home when the user does not have the ADMIN role', () => {
    authServiceSpy.getUser.and.returnValue(buildUser('CUSTOMER'));

    const result = executeGuard();

    expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
    expect(result).not.toBeTrue();
  });

  it('should redirect to home when there is no logged-in user', () => {
    authServiceSpy.getUser.and.returnValue(null);

    const result = executeGuard();

    expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
    expect(result).not.toBeTrue();
  });
});
