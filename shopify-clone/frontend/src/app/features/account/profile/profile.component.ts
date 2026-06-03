import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, RouterLink],
  template: `
    <div class="page-container" style="padding: 32px 24px; max-width: 600px">
      <h1>My Account</h1>
      @if (user) {
        <mat-card style="margin-top: 24px; padding: 24px">
          <h2>{{ user.firstName }} {{ user.lastName }}</h2>
          <p style="color: var(--text-secondary); margin: 8px 0">{{ user.email }}</p>
          <p style="margin-top: 4px"><strong>Role:</strong> {{ user.role }}</p>
        </mat-card>
        <div style="margin-top: 16px">
          <a mat-stroked-button routerLink="/account/orders">View My Orders</a>
        </div>
      }
    </div>
  `
})
export class ProfileComponent {
  user = inject(AuthService).getUser();
}
