import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { ApiService } from './api.service';

/** /admin is reachable only with a Supabase session whose email is in `admins`. RLS enforces the same server-side. */
export const adminGuard: CanActivateFn = async () => {
  const api = inject(ApiService);
  const router = inject(Router);
  return (await api.isAdmin()) ? true : router.createUrlTree(['/admin-login']);
};
