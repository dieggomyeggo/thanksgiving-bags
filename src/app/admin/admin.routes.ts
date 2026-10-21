import { Routes } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';

// Everything under /admin is lazy-loaded, including the Material table/tabs/datepicker code.
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    providers: [provideNativeDateAdapter()],
    loadComponent: () => import('./admin-shell').then((m) => m.AdminShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'orders' },
      { path: 'catalog', title: 'Admin: Catalog', loadComponent: () => import('./catalog-editor').then((m) => m.CatalogEditor) },
      { path: 'orders', title: 'Admin: Orders', loadComponent: () => import('./orders-manager').then((m) => m.OrdersManager) },
      { path: 'rollup', title: 'Admin: Rollup', loadComponent: () => import('./rollup-export').then((m) => m.RollupExport) },
      { path: 'settings', title: 'Admin: Settings', loadComponent: () => import('./settings-page').then((m) => m.SettingsPage) },
    ],
  },
];
