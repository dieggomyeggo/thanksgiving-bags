import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { chicagoDate } from '@shared/cutoffs';
import { buildRollup, inRollup, rollupCsv, type RollupItem } from '@shared/rollup';
import { money } from '../core/format';
import { AdminData } from './admin-data';

@Component({
  selector: 'app-rollup-export',
  imports: [FormsModule, MatTableModule, MatButton, MatFormField, MatLabel, MatInput, MatSelect, MatOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Amway rollup</h1>
    <p class="muted">Paid orders plus cash orders you confirmed, summed per item and rounded up to whole boxes. TEST orders and orders already sent to Amway are excluded.</p>

    <mat-form-field appearance="outline" subscriptSizing="dynamic">
      <mat-label>Batch</mat-label>
      <mat-select [ngModel]="batchId()" (ngModelChange)="batchId.set($event)" name="batch">
        <mat-option value="">Next batch (unbatched orders)</mat-option>
        @for (b of data.batches(); track b.id) { <mat-option [value]="b.id">{{ b.label }} ({{ b.batchDate }})</mat-option> }
      </mat-select>
    </mat-form-field>

    <div class="table-wrap">
      <table mat-table [dataSource]="roll().rows" aria-label="Rollup">
        <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Item</th><td mat-cell *matCellDef="let r">{{ r.name }}<div class="muted small">{{ r.kind === 'amway' ? 'Amway' : 'buy elsewhere' }}</div></td></ng-container>
        <ng-container matColumnDef="units"><th mat-header-cell *matHeaderCellDef>Units sold</th><td mat-cell *matCellDef="let r">{{ r.units }}</td></ng-container>
        <ng-container matColumnDef="boxes"><th mat-header-cell *matHeaderCellDef>Boxes (× size)</th><td mat-cell *matCellDef="let r">{{ r.boxes }} × {{ r.boxSize }}</td></ng-container>
        <ng-container matColumnDef="leftover"><th mat-header-cell *matHeaderCellDef>Leftover</th><td mat-cell *matCellDef="let r">{{ r.leftover }}</td></ng-container>
        <ng-container matColumnDef="cost"><th mat-header-cell *matHeaderCellDef>Est. cost</th><td mat-cell *matCellDef="let r">{{ m(r.estCostCents) }}</td></ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let r; columns: cols"></tr>
        <tr class="mat-row" *matNoDataRow><td class="mat-cell" [attr.colspan]="cols.length">Nothing to order yet.</td></tr>
      </table>
    </div>
    <p><b>Estimated Amway cost: {{ m(roll().amwayCostCents) }}</b> · {{ orderCount() }} order(s)</p>

    <div class="actions">
      <button mat-stroked-button type="button" (click)="copy()" [disabled]="!roll().rows.length">Copy list</button>
      <button mat-stroked-button type="button" (click)="download()" [disabled]="!roll().rows.length">Download CSV</button>
    </div>

    @if (!batchId() && orderCount() > 0) {
      <h2>Close this batch</h2>
      <p class="muted">After you place the Amway order, record it: the orders move to "Ordered from Amway" and leave the next rollup.</p>
      <div class="actions">
        <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Batch label</mat-label><input matInput [ngModel]="label()" (ngModelChange)="label.set($event)" name="label"></mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Amway order date (YYYY-MM-DD)</mat-label><input matInput [ngModel]="date()" (ngModelChange)="date.set($event)" name="date"></mat-form-field>
        <button mat-flat-button type="button" (click)="close()" [disabled]="!label().trim() || !/^\\d{4}-\\d{2}-\\d{2}$/.test(date())">Mark orders as ordered from Amway</button>
      </div>
    }
  `,
  styles: `
    .table-wrap { overflow-x: auto; } table { width: 100%; background: transparent; }
    .small { font-size: 11px; } .actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin: 8px 0; }
  `,
})
export class RollupExport {
  protected readonly data = inject(AdminData);
  private readonly snack = inject(MatSnackBar);
  protected readonly m = money;
  protected readonly cols = ['name', 'units', 'boxes', 'leftover', 'cost'];
  protected readonly batchId = signal('');
  protected readonly label = signal('');
  protected readonly date = signal(this.suggest());

  private suggest(): string { return chicagoDate(new Date()); }

  private readonly items = computed<RollupItem[]>(() => this.data.items());
  private readonly selected = computed(() => {
    const id = this.batchId();
    if (!id) return this.data.orders().filter((o) => !o.batchId);
    // A past batch: its orders have moved on to "ordered" etc., so count them as paid for the export.
    return this.data.orders().filter((o) => o.batchId === id).map((o) => ({ ...o, status: 'paid' as const, test: false }));
  });
  protected readonly roll = computed(() => buildRollup(this.selected(), this.items()));
  protected readonly orderCount = computed(() => this.selected().filter(inRollup).length);

  protected async copy(): Promise<void> {
    try { await navigator.clipboard.writeText(this.roll().text); this.snack.open('Copied', 'OK', { duration: 1500 }); }
    catch { this.snack.open('Copy blocked by the browser; select the table instead.', 'OK', { duration: 4000 }); }
  }

  protected download(): void {
    const blob = new Blob([rollupCsv(this.roll())], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `amway-rollup-${this.batchId() || chicagoDate(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  protected async close(): Promise<void> {
    try {
      const b = await this.data.api.adminCreateBatch({ label: this.label().trim(), batchDate: this.date(), notes: null });
      for (const o of this.selected().filter(inRollup)) {
        const real = this.data.orders().find((x) => x.number === o.number);
        if (real) await this.data.api.adminUpdateOrder(real.id, { batchId: b.id, status: 'ordered' });
      }
      await this.data.refresh();
      this.label.set('');
      this.snack.open('Batch recorded', 'OK', { duration: 3000 });
    } catch (e) {
      this.snack.open(`Failed: ${e instanceof Error ? e.message : e}`, 'OK', { duration: 6000 });
    }
  }
}
