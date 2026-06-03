import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { artisanGuard } from './core/guards/artisan.guard';
import { merchantGuard } from './core/guards/merchant.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/storefront/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'marketplace',
    loadComponent: () => import('./features/marketplace/marketplace.component').then(m => m.MarketplaceComponent)
  },
  {
    path: 'products',
    loadComponent: () => import('./features/storefront/product-list/product-list.component').then(m => m.ProductListComponent)
  },
  {
    path: 'products/:slug',
    loadComponent: () => import('./features/storefront/product-detail/product-detail.component').then(m => m.ProductDetailComponent)
  },
  {
    path: 'cart',
    loadComponent: () => import('./features/cart/cart.component').then(m => m.CartComponent)
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () => import('./features/checkout/checkout.component').then(m => m.CheckoutComponent)
  },
  {
    path: 'checkout/success',
    loadComponent: () => import('./features/checkout/checkout-success.component').then(m => m.CheckoutSuccessComponent)
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadChildren: () => import('./features/account/account.routes').then(m => m.accountRoutes)
  },
  {
    path: 'artisan',
    canActivate: [artisanGuard],
    loadChildren: () => import('./features/artisan/artisan.routes').then(m => m.artisanRoutes)
  },
  {
    path: 'merchant',
    canActivate: [merchantGuard],
    loadChildren: () => import('./features/merchant/merchant.routes').then(m => m.merchantRoutes)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes)
  },
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
