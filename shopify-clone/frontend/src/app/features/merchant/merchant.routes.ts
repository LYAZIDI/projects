import { Routes } from '@angular/router';

export const merchantRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/merchant-dashboard.component').then(m => m.MerchantDashboardComponent)
  },
  {
    path: 'catalog',
    loadComponent: () => import('./catalog/merchant-catalog.component').then(m => m.MerchantCatalogComponent)
  },
  {
    path: 'brand-studio/:productId',
    loadComponent: () => import('./brand-studio/brand-studio.component').then(m => m.BrandStudioComponent)
  },
  {
    path: 'my-products',
    loadComponent: () => import('./my-products/merchant-products.component').then(m => m.MerchantProductsComponent)
  }
];
