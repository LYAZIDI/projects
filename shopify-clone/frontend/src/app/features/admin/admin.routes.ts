import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'products',
    loadComponent: () => import('./products/products-admin.component').then(m => m.ProductsAdminComponent)
  },
  {
    path: 'orders',
    loadComponent: () => import('./orders/orders-admin.component').then(m => m.OrdersAdminComponent)
  },
  {
    path: 'customers',
    loadComponent: () => import('./customers/customers-admin.component').then(m => m.CustomersAdminComponent)
  }
];
