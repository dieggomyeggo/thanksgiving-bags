import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

/** "Now" for client-side cutoff display. In mock/test builds `?today=2026-11-17` simulates a date (the server uses real time). */
@Injectable({ providedIn: 'root' })
export class ClockService {
  private readonly override: Date | null = (() => {
    if (!environment.allowDateOverride || typeof location === 'undefined') return null;
    const t = new URLSearchParams(location.search).get('today');
    return t && /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(`${t}T18:00:00Z`) : null;
  })();

  now(): Date {
    return this.override ?? new Date();
  }
}
