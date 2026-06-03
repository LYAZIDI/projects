import { Component, inject, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { Store } from '@ngrx/store';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthActions } from '../../../store/auth/auth.actions';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatBadgeModule, MatMenuModule, MatButtonModule],
  template: `
    <header class="navbar" [class.scrolled]="scrolled()">
      <!-- Top bar -->
      <div class="top-bar">
        <span>FREE SHIPPING ON ORDERS OVER €200</span>
      </div>

      <!-- Main nav -->
      <nav class="main-nav">
        <!-- Left links -->
        <div class="nav-left">
          <a routerLink="/marketplace" routerLinkActive="active">Marketplace</a>
          <a routerLink="/products" routerLinkActive="active">Collections</a>
        </div>

        <!-- Logo center -->
        <a routerLink="/" class="logo">
          <img src="assets/logo.svg" alt="Leathera" height="44">
        </a>

        <!-- Right actions -->
        <div class="nav-right">
          <a routerLink="/auth/register">Devenir Artisan</a>

          <button class="icon-btn" routerLink="/cart" aria-label="Cart">
            <mat-icon [matBadge]="cartCount()" [matBadgeHidden]="cartCount() === 0"
                      matBadgeColor="warn" matBadgeSize="small">
              shopping_bag
            </mat-icon>
          </button>

          @if (user) {
            <button class="icon-btn" [matMenuTriggerFor]="userMenu" aria-label="Account">
              <mat-icon>person_outline</mat-icon>
            </button>
            <mat-menu #userMenu="matMenu" class="luxury-menu">
              <div class="menu-header">{{ user.firstName }} {{ user.lastName }}</div>
              @if (user.role === 'ARTISAN') {
                <a mat-menu-item routerLink="/artisan/dashboard">Mon Espace Artisan</a>
                <a mat-menu-item routerLink="/artisan/products">Mes Produits</a>
                <a mat-menu-item routerLink="/artisan/earnings">Mes Revenus</a>
              }
              @if (user.role === 'MERCHANT') {
                <a mat-menu-item routerLink="/merchant/dashboard">Mon Espace Commerçant</a>
                <a mat-menu-item routerLink="/merchant/catalog">Catalogue Pro</a>
                <a mat-menu-item routerLink="/merchant/my-products">Ma Boutique</a>
              }
              @if (user.role === 'CUSTOMER' || !user.role) {
                <a mat-menu-item routerLink="/account">Mon Compte</a>
                <a mat-menu-item routerLink="/account/orders">Mes Commandes</a>
              }
              @if (user.role === 'ADMIN') {
                <a mat-menu-item routerLink="/admin">Admin Panel</a>
              }
              <button mat-menu-item (click)="logout()">Déconnexion</button>
            </mat-menu>
          } @else {
            <a routerLink="/auth/login" class="nav-link-action">Connexion</a>
          }
        </div>
      </nav>
    </header>
  `,
  styles: [`
    .navbar {
      position: sticky; top: 0; z-index: 1000;
      background: var(--black);
      transition: box-shadow 0.3s;
      &.scrolled { box-shadow: 0 2px 20px rgba(0,0,0,0.4); }
    }

    .top-bar {
      background: var(--gold-dark);
      color: var(--cream);
      text-align: center;
      padding: 6px;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.2em;
    }

    .main-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 40px;
      height: 72px;
      border-bottom: 1px solid var(--border-dark);
    }

    .nav-left, .nav-right {
      display: flex;
      align-items: center;
      gap: 32px;
      flex: 1;
    }

    .nav-right { justify-content: flex-end; }

    a:not(.logo):not(.nav-link-action) {
      color: #B0A898;
      font-size: 11px;
      font-weight: 400;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      text-decoration: none;
      transition: color 0.2s;

      &:hover, &.active { color: var(--gold-light); }
    }

    .nav-link-action {
      color: #B0A898;
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      cursor: pointer;
      transition: color 0.2s;
      &:hover { color: var(--gold-light); }
    }

    .logo {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .icon-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #B0A898;
      display: flex;
      align-items: center;
      padding: 4px;
      transition: color 0.2s;
      &:hover { color: var(--gold-light); }
      mat-icon { font-size: 22px; width: 22px; height: 22px; }
    }

    .menu-header {
      padding: 12px 16px 8px;
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border);
    }
  `]
})
export class NavbarComponent {
  private store = inject(Store);
  private cartService = inject(CartService);
  private authService = inject(AuthService);

  readonly cartCount = this.cartService.itemCount;
  readonly user = this.authService.getUser();
  scrolled = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 10);
  }

  logout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}
