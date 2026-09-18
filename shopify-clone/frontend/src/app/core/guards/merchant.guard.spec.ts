import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { merchantGuard } from './merchant.guard';
import { AuthService, AuthResponse } from '../services/auth.service';

describe('merchantGuard', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const buildUser = (role: string): AuthResponse => ({
    accessToken: 't', refreshToken: 'r', tokenType: 'Bearer',
    userId: 1, email: 'a@b.com', firstName: 'A', lastName: 'B', role
  });

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getUser']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });
  });

  const executeGuard = () =>
    TestBed.runInInjectionContext(() => merchantGuard({} as any, {} as any));

  it('should allow activation when the user has the MERCHANT role', () => {
    authServiceSpy.getUser.and.returnValue(buildUser('MERCHANT'));

    expect(executeGuard()).toBeTrue();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should allow activation when the user has the ADMIN role', () => {
    authServiceSpy.getUser.and.returnValue(buildUser('ADMIN'));

    expect(executeGuard()).toBeTrue();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should deny activation and navigate to login when the user has a different role', () => {
    authServiceSpy.getUser.and.returnValue(buildUser('ARTISAN'));

    expect(executeGuard()).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should deny activation and navigate to login when there is no logged-in user', () => {
    authServiceSpy.getUser.and.returnValue(null);

    expect(executeGuard()).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
