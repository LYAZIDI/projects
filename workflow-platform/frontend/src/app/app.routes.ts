import { Routes } from '@angular/router';
import { authGuard, permissionGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./features/shared/forbidden.component').then(m => m.ForbiddenComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: 'crm/leads/:id',
        loadComponent: () =>
          import('./features/crm/lead-detail.component').then(m => m.LeadDetailComponent),
      },
      {
        path: 'crm/quotes/:id',
        loadComponent: () =>
          import('./features/crm/quote-detail.component').then(m => m.QuoteDetailComponent),
      },
      {
        path: 'admin/workflow',
        canActivate: [permissionGuard('PERM_WORKFLOW_READ')],
        loadComponent: () =>
          import('./features/admin/workflow-designer.component').then(m => m.WorkflowDesignerComponent),
      },
      { path: '', redirectTo: 'crm/leads', pathMatch: 'prefix' },
    ],
  },
  { path: '**', redirectTo: '' },
];
