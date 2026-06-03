import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  template: `
    <div class="not-found">
      <h1>404</h1>
      <p>Page not found</p>
      <a mat-raised-button color="primary" routerLink="/">Go Home</a>
    </div>
  `,
  styles: [`
    .not-found {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 60vh; gap: 16px;
      h1 { font-size: 72px; font-weight: 700; color: var(--primary); }
      p { font-size: 18px; color: var(--text-secondary); }
    }
  `]
})
export class NotFoundComponent {}
