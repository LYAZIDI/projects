import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService, AuthResponse, LoginRequest, RegisterRequest } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/auth`;

  const mockAuthResponse: AuthResponse = {
    accessToken: 'access-123',
    refreshToken: 'refresh-456',
    tokenType: 'Bearer',
    userId: 1,
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    role: 'CUSTOMER'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should POST to /auth/login with the given credentials', () => {
      const request: LoginRequest = { email: 'jane@example.com', password: 'secret123' };

      service.login(request).subscribe(res => {
        expect(res).toEqual(mockAuthResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockAuthResponse);
    });

    it('should persist tokens and user to localStorage on successful login', () => {
      const request: LoginRequest = { email: 'jane@example.com', password: 'secret123' };

      service.login(request).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/login`);
      req.flush(mockAuthResponse);

      expect(localStorage.getItem('access_token')).toBe('access-123');
      expect(localStorage.getItem('refresh_token')).toBe('refresh-456');
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(mockAuthResponse);
    });

    it('should propagate an error response and not store tokens', () => {
      const request: LoginRequest = { email: 'jane@example.com', password: 'wrong' };
      let errorStatus: number | undefined;

      service.login(request).subscribe({
        next: () => fail('expected an error'),
        error: (err) => errorStatus = err.status
      });

      const req = httpMock.expectOne(`${baseUrl}/login`);
      req.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

      expect(errorStatus).toBe(401);
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('register', () => {
    it('should POST to /auth/register with the registration payload', () => {
      const request: RegisterRequest = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'secret123',
        role: 'ARTISAN',
        brandName: 'Leathera',
        bio: 'Craftsman',
        location: 'Lyon, France'
      };

      service.register(request).subscribe(res => {
        expect(res).toEqual(mockAuthResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockAuthResponse);
    });

    it('should persist tokens and user to localStorage on successful register', () => {
      const request: RegisterRequest = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'secret123',
        role: 'CUSTOMER'
      };

      service.register(request).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/register`);
      req.flush(mockAuthResponse);

      expect(localStorage.getItem('access_token')).toBe('access-123');
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(mockAuthResponse);
    });

    it('should propagate server errors (e.g. 500) without storing tokens', () => {
      const request: RegisterRequest = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'secret123',
        role: 'CUSTOMER'
      };
      let errorStatus: number | undefined;

      service.register(request).subscribe({
        next: () => fail('expected an error'),
        error: (err) => errorStatus = err.status
      });

      const req = httpMock.expectOne(`${baseUrl}/register`);
      req.flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });

      expect(errorStatus).toBe(500);
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('logout', () => {
    it('should remove tokens and user from localStorage', () => {
      localStorage.setItem('access_token', 'a');
      localStorage.setItem('refresh_token', 'b');
      localStorage.setItem('user', '{}');

      service.logout();

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('getToken', () => {
    it('should return the stored access token', () => {
      localStorage.setItem('access_token', 'stored-token');
      expect(service.getToken()).toBe('stored-token');
    });

    it('should return null when no token is stored', () => {
      expect(service.getToken()).toBeNull();
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when a token is present', () => {
      localStorage.setItem('access_token', 'stored-token');
      expect(service.isLoggedIn()).toBeTrue();
    });

    it('should return false when no token is present', () => {
      expect(service.isLoggedIn()).toBeFalse();
    });
  });

  describe('getUser', () => {
    it('should return the parsed user object when stored', () => {
      localStorage.setItem('user', JSON.stringify(mockAuthResponse));
      expect(service.getUser()).toEqual(mockAuthResponse);
    });

    it('should return null when no user is stored', () => {
      expect(service.getUser()).toBeNull();
    });
  });
});
