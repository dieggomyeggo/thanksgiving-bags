import { ChangeDetectionStrategy, Component, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatPaginator } from '@angular/material/paginator';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { nextStatuses, STATUS_LABELS } from '@shared/orders';
import type { OrderRow, OrderStatus } from '@shared/types';
import { money } from '../core/format';
import { NoticeDialog } from '../shop/notice-dialog';
import { AdminData } from './admin-data';
import { OrderDialog, type OrderDialogData, type OrderDialogResult } from './order-dialog';

@Component({
  selector: 'app-orders-manager',
  imports: [FormsModule, MatTableModule, MatSort, MatSortHeader, MatPaginator, MatButton, MatIconButton, MatIcon, MatMenu, MatMenuItem, MatMenuTrigger, MatFormField, MatLabel, MatInput, MatSelect, MatOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="row head">
      <h1>Orders <span class="muted count">({{ filtered().length }})</span></h1>
      <span>
        <button mat-stroked-button type="button" (click)="expire()">Expire unpaid now</button>
        <button mat-stroked-button type="button" (click)="deleteTests()">Delete TEST orders</button>
        <button mat-button type="button" (click)="data.refresh()"><mat-icon>refresh</mat-icon> Refresh</button>
      </span>
    </div>
    <div class="filters">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Status</mat-label>
        <mat-select [ngModel]="status()" (ngModelChange)="status.set($event)" name="status">
          <mat-option value="">All</mat-option>
          @for (s of statuses; track s) { <mat-option [value]="s">{{ label(s) }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Search number, name, email</mat-label>
        <input matInput [ngModel]="query()" (ngModelChange)="query.set($event)" name="q">
      </mat-form-field>
    </div>

    <div class="table-wrap">
      <table mat-table [dataSource]="ds" matSort aria-label="Orders">
        <ng-container matColumnDef="number"><th mat-header-cell *matHeaderCellDef mat-sort-header>Order</th><td mat-cell *matCellDef="let o"><b>{{ o.number }}</b></td></ng-container>
        <ng-container matColumnDef="createdAt"><th mat-header-cell *matHeaderCellDef mat-sort-header>Placed</th><td mat-cell *matCellDef="let o">{{ o.createdAt.slice(5, 16).replace('T', ' ') }}</td></ng-container>
        <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef mat-sort-header>Customer</th><td mat-cell *matCellDef="let o">{{ o.name ?? '(purged)' }}<div class="muted small">{{ o.email ?? '' }}</div></td></ng-container>
        <ng-container matColumnDef="method"><th mat-header-cell *matHeaderCellDef>How</th><td mat-cell *matCellDef="let o">{{ o.method }} · {{ o.payMethod }}</td></ng-container>
        <ng-container matColumnDef="totalCents"><th mat-header-cell *matHeaderCellDef mat-sort-header>Total</th><td mat-cell *matCellDef="let o">{{ m(o.totalCents) }}{{ o.shippingQuoteNeeded ? ' + ship' : '' }}</td></ng-container>
        <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th><td mat-cell *matCellDef="let o"><b>{{ label(o.status) }}</b></td></ng-container>
        <ng-container matColumnDef="flags">
          <th mat-header-cell *matHeaderCellDef>Flags</th>
          <td mat-cell *matCellDef="let o">
            @if (o.late) { <span class="flag">late</span> }
            @if (o.needsApproval) { <span class="flag warn">needs approval</span> }
            @if (o.test) { <span class="flag">TEST</span> }
            @if (o.payMethod === 'cash' && o.cashConfirmed) { <span class="flag">cash OK</span> }
            @if (o.batchId) { <span class="flag">batched</span> }
          </td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef><span class="visually-hidden">Actions</span></th>
          <td mat-cell *matCellDef="let o">
            <button mat-icon-button [matMenuTriggerFor]="menu" [attr.aria-label]="'Actions for ' + o.number"><mat-icon>more_vert</mat-icon></button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item (click)="open(o)">View / edit details</button>
              @if (o.needsApproval) { <button mat-menu-item (click)="approve(o)">Approve (send payment steps)</button> }
              @if (o.payMethod === 'cash' && o.status === 'placed' && !o.cashConfirmed) { <button mat-menu-item (click)="confirmCash(o)">Confirm cash by text</button> }
              @for (s of next(o); track s) { <button mat-menu-item (click)="setStatus(o, s)">Mark {{ label(s) }}</button> }
              @if (o.status === 'paid' || o.status === 'packed') { <button mat-menu-item (click)="resend(o)">Resend {{ o.status === 'paid' ? 'paid' : 'ready' }} email</button> }
            </mat-menu>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let r; columns: cols"></tr>
        <tr class="mat-row" *matNoDataRow><td class="mat-cell" [attr.colspan]="cols.length">No orders match.</td></tr>
      </table>
    </div>
    <mat-paginator [pageSizeOptions]="[10, 25, 50]" [pageSize]="25" showFirstLastButtons />
  `,
  styles: `
    .head { flex-wrap: wrap; } .count { font-size: 1rem; } .small { font-size: 11px; }
    .filters { display: flex; gap: 12px; flex-wrap: wrap; margin: 8px 0 12px; }
    .table-wrap { overflow-x: auto; } table { width: 100%; background: transparent; }
    .flag { font-size: 11px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 99px; padding: 0 7px; margin-right: 3px; white-space: nowrap; }
    .flag.warn { border-color: light-dark(#a8741a, #e0b25c); color: light-dark(#8a5a00, #f0c068); }
  `,
})
export class OrdersManager {
  protected readonly data = inject(AdminData);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  protected readonly m = money;
  protected readonly label = (s: OrderStatus) => STATUS_LABELS[s];
  protected readonly statuses = Object.keys(STATUS_LABELS) as OrderStatus[];
  protected readonly cols = ['number', 'createdAt', 'name', 'method', 'totalCents', 'status', 'flags', 'actions'];
  protected readonly status = signal('');
  protected readonly query = signal('');
  protected readonly ds = new MatTableDataSource<OrderRow>([]);
  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.data.orders().filter(
      (o) => (!this.status() || o.status === this.status()) &&
        (!q || [o.number, o.name, o.email].some((v) => v?.toLowerCase().includes(q))),
    );
  });

  @ViewChild(MatSort) set sort(s: MatSort) { this.ds.sort = s; }
  @ViewChild(MatPaginator) set paginator(p: MatPaginator) { this.ds.paginator = p; }

  constructor() { effect(() => { this.ds.data = this.filtered(); }); }

  protected next(o: OrderRow): OrderStatus[] {
    // Marking Paid / Packed also sends an email, so those two go through setStatus below. Expiry is automatic.
    return nextStatuses(o.status, o.method).filter((s) => s !== 'expired');
  }

  private fail(e: unknown): void { this.snack.open(`Failed: ${e instanceof Error ? e.message : e}`, 'OK', { duration: 6000 }); }

  protected open(o: OrderRow): void {
    this.dialog.open<OrderDialog, OrderDialogData, OrderDialogResult>(OrderDialog, { data: { order: o, items: this.data.items() } }).afterClosed().subscribe(async (patch) => {
      if (!patch) return;
      try { await this.data.api.adminUpdateOrder(o.id, patch); await this.data.refresh(); this.snack.open('Saved', 'OK', { duration: 2000 }); } catch (e) { this.fail(e); }
    });
  }

  protected async setStatus(o: OrderRow, s: OrderStatus): Promise<void> {
    try {
      if (s === 'packed') {
        this.dialog.open<OrderDialog, OrderDialogData, OrderDialogResult>(OrderDialog, { data: { order: o, items: this.data.items(), readyStep: true } }).afterClosed().subscribe(async (patch) => {
          if (!patch) return;
          try {
            await this.data.api.adminUpdateOrder(o.id, { ...patch, status: 'packed' });
            await this.data.api.adminNotify(o.id, 'ready');
            await this.data.refresh();
            this.snack.open('Packed; "ready" email sent', 'OK', { duration: 3000 });
          } catch (e) { this.fail(e); }
        });
        return;
      }
      if (s === 'cancelled') {
        const ok = await new Promise<boolean>((r) => this.dialog.open<NoticeDialog, unknown, boolean>(NoticeDialog, { data: { title: `Cancel ${o.number}?`, body: 'This releases the order. Only cancel before the Amway order is placed.', confirmLabel: 'Cancel order', cancelLabel: 'Keep' } }).afterClosed().subscribe((v) => r(v === true)));
        if (!ok) return;
      }
      await this.data.api.adminUpdateOrder(o.id, { status: s });
      if (s === 'paid') await this.data.api.adminNotify(o.id, 'paid');
      await this.data.refresh();
      this.snack.open(s === 'paid' ? 'Marked Paid; thank-you email sent' : `Marked ${this.label(s)}`, 'OK', { duration: 3000 });
    } catch (e) { this.fail(e); }
  }

  protected async approve(o: OrderRow): Promise<void> {
    try {
      await this.data.api.adminUpdateOrder(o.id, { needsApproval: false });
      await this.data.api.adminNotify(o.id, 'placed', true);
      await this.data.refresh();
      this.snack.open('Approved; order email with payment steps re-sent', 'OK', { duration: 3000 });
    } catch (e) { this.fail(e); }
  }

  protected async confirmCash(o: OrderRow): Promise<void> {
    try { await this.data.api.adminUpdateOrder(o.id, { cashConfirmed: true }); await this.data.refresh(); } catch (e) { this.fail(e); }
  }

  protected async resend(o: OrderRow): Promise<void> {
    try { await this.data.api.adminNotify(o.id, o.status === 'paid' ? 'paid' : 'ready', true); this.snack.open('Email re-sent', 'OK', { duration: 2500 }); } catch (e) { this.fail(e); }
  }

  protected async expire(): Promise<void> {
    try { const n = await this.data.api.adminExpireUnpaid(); await this.data.refresh(); this.snack.open(`${n} unpaid order(s) expired`, 'OK', { duration: 3000 }); } catch (e) { this.fail(e); }
  }

  protected deleteTests(): void {
    const n = this.data.orders().filter((o) => o.test).length;
    this.dialog.open<NoticeDialog, unknown, boolean>(NoticeDialog, { data: { title: 'Delete TEST orders', body: `${n} order(s) flagged TEST will be permanently deleted. Real orders are not touched.`, confirmLabel: 'Delete', cancelLabel: 'Cancel' } }).afterClosed().subscribe(async (ok) => {
      if (!ok) return;
      try { const c = await this.data.api.adminDeleteTestOrders(); await this.data.refresh(); this.snack.open(`${c} TEST order(s) deleted`, 'OK', { duration: 3000 }); } catch (e) { this.fail(e); }
    });
  }
}
