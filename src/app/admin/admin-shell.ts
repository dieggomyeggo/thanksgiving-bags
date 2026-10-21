import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import { MatToolbar } from '@angular/material/toolbar';
import { ApiService } from '../core/api.service';
import { AdminData } from './admin-data';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbar, MatButton, MatTabNav, MatTabLink, MatTabNavPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar>
      <span>Admin</span>
      <span class="spacer"></span>
      <span class="muted email">{{ email() }}</span>
      <a mat-button routerLink="/">Shop</a>
      <button mat-button type="button" (click)="signOut()">Sign out</button>
    </mat-toolbar>
    <nav mat-tab-nav-bar [tabPanel]="panel" aria-label="Admin sections">
      @for (t of tabs; track t.path) {
        <a mat-tab-link [routerLink]="t.path" routerLinkActive #rla="routerLinkActive" [active]="rla.isActive">{{ t.label }}</a>
      }
    </nav>
    <mat-tab-nav-panel #panel>
      <div class="wrap">
        @if (purgeDue()) {
          <div class="notice warn" role="status">Personal data must be deleted by Dec 31. Use Settings → Purge personal data when follow-up emails and the announcement are done.</div>
        }
        @if (data.error()) { <div class="notice err" role="alert">{{ data.error() }}</div> }
        <router-outlet />
      </div>
    </mat-tab-nav-panel>
  `,
  styles: `.spacer { flex: 1; } .email { font-size: 13px; margin-right: 8px; }`,
})
export class AdminShell {
  protected readonly data = inject(AdminData);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly email = signal('');
  protected readonly tabs = [
    { path: 'orders', label: 'Orders' },
    { path: 'catalog', label: 'Catalog' },
    { path: 'rollup', label: 'Rollup' },
    { path: 'settings', label: 'Settings & donation' },
  ];
  protected readonly purgeDue = computed(() => {
    const m = new Date().getMonth(); // Dec (11) onward through Jan
    return (m === 11 || m === 0) && this.data.orders().some((o) => !o.piiPurgedAt && (o.email || o.name));
  });

  constructor() {
    void this.api.sessionEmail().then((e) => this.email.set(e ?? ''));
    void this.data.refresh();
  }

  protected async signOut(): Promise<void> {
    await this.api.signOut();
    await this.router.navigate(['/']);
  }
}
