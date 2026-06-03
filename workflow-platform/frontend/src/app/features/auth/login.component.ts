import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-page">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Workflow Platform</mat-card-title>
          <mat-card-subtitle>Sign in to continue</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form (ngSubmit)="submit()" #f="ngForm">
            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Email</mat-label>
              <input matInput type="email" name="email" [(ngModel)]="email" required />
            </mat-form-field>

            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Password</mat-label>
              <input matInput type="password" name="password" [(ngModel)]="password" required />
            </mat-form-field>

            @if (error()) {
              <p class="login-error">{{ error() }}</p>
            }

            <button mat-flat-button color="primary" type="submit"
                    style="width:100%" [disabled]="loading()">
              @if (loading()) { <mat-spinner diameter="18" /> }
              @else { Sign in }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-page {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: #f5f5f5;
    }
    .login-card  { width: 360px; padding: 16px; }
    .login-error { color: #EF4444; font-size: 14px; margin-top: 4px; }
  `],
})
export class LoginComponent {
  email    = '';
  password = '';
  loading  = signal(false);
  error    = signal<string | null>(null);

  private auth   = inject(AuthService);
  private router = inject(Router);

  submit() {
    this.loading.set(true);
    this.error.set(null);
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        this.loading.set(false);
        this.error.set(err.error?.detail ?? 'Authentication failed');
      },
    });
  }
}
