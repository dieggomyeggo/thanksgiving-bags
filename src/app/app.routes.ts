import { Routes } from '@angular/router';
import { adminGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', title: 'Thanksgiving Sample Bags', loadComponent: () => import('./shop/shop-page').then((m) => m.ShopPage) },
  { path: 'learn-more', title: 'Learn more', loadComponent: () => import('./learn-more/learn-more-page').then((m) => m.LearnMorePage) },
  { path: 'totals', title: 'Donation totals', loadComponent: () => import('./totals/totals-page').then((m) => m.TotalsPage) },
  { path: 'admin-login', title: 'Admin sign-in', loadComponent: () => import('./admin/login-page').then((m) => m.LoginPage) },
  // Lazy-loaded behind the guard: shoppers never download the admin or its Material table/tab/datepicker code.
  { path: 'admin', canActivate: [adminGuard], loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES) },
  { path: '**', redirectTo: '' },
];
