import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  userId: string;
  email: string;
  tenantId: string;
  roles: string[];
  perms: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

const TOKEN_KEY = 'wf_access_token';
const USER_KEY  = 'wf_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _token  = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private _user   = signal<AuthUser | null>(
    JSON.parse(localStorage.getItem(USER_KEY) ?? 'null')
  );

  readonly token  = this._token.asReadonly();
  readonly user   = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token());

  constructor(private http: HttpClient, private router: Router) {}

  login(req: LoginRequest) {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, req).pipe(
      tap(res => {
        localStorage.setItem(TOKEN_KEY, res.accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this._token.set(res.accessToken);
        this._user.set(res.user);
      }),
      catchError(err => throwError(() => err))
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  hasPermission(perm: string): boolean {
    return this._user()?.perms.includes(perm) ?? false;
  }

  hasRole(role: string): boolean {
    return this._user()?.roles.includes(role) ?? false;
  }
}
