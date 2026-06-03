import { Routes } from '@angular/router';

export const artisanRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/artisan-dashboard.component').then(m => m.ArtisanDashboardComponent)
  },
  {
    path: 'products',
    loadComponent: () => import('./products/artisan-products.component').then(m => m.ArtisanProductsComponent)
  },
  {
    path: 'earnings',
    loadComponent: () => import('./earnings/artisan-earnings.component').then(m => m.ArtisanEarningsComponent)
  }
];
