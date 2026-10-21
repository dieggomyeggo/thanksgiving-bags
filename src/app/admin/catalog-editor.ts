import { ChangeDetectionStrategy, Component, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatPaginator } from '@angular/material/paginator';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { catalogFromCsv } from '@shared/catalog-csv';
import { assertPricingFloor } from '@shared/pricing';
import type { ItemRow } from '@shared/types';
import { money } from '../core/format';
import { AdminData } from './admin-data';
import { ItemDialog } from './item-dialog';
import { NoticeDialog } from '../shop/notice-dialog';

@Component({
  selector: 'app-catalog-editor',
  imports: [MatTableModule, MatSort, MatSortHeader, MatPaginator, MatButton, MatIconButton, MatIcon, MatMenu, MatMenuItem, MatMenuTrigger, MatSlideToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="row head">
      <h1>Catalog</h1>
      <span>
        <button mat-stroked-button type="button" (click)="csv.click()"><mat-icon>upload_file</mat-icon> Import CSV</button>
        <input #csv type="file" accept=".csv,text/csv" class="visually-hidden" (change)="importCsv($event)" aria-label="Import catalog CSV">
        <button mat-flat-button type="button" (click)="edit(null)"><mat-icon>add</mat-icon> Add item</button>
      </span>
    </div>
    <p class="muted">Prices are computed from cost by the pricing rule (max of retail and cost + 25% / $0.50, ÷ 0.97, rounded up to $0.25). Cost never reaches shoppers. Tags stay hidden until marked verified.</p>

    <div class="table-wrap">
      <table mat-table [dataSource]="ds" matSort aria-label="Catalog">
        <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef mat-sort-header>Item</th><td mat-cell *matCellDef="let i">{{ i.name }}<div class="muted small">{{ i.id }}</div></td></ng-container>
        <ng-container matColumnDef="shelf"><th mat-header-cell *matHeaderCellDef mat-sort-header>Shelf</th><td mat-cell *matCellDef="let i">{{ i.shelf }}</td></ng-container>
        <ng-container matColumnDef="costCents"><th mat-header-cell *matHeaderCellDef mat-sort-header>Cost</th><td mat-cell *matCellDef="let i">{{ m(i.costCents) }}</td></ng-container>
        <ng-container matColumnDef="unitPriceCents"><th mat-header-cell *matHeaderCellDef mat-sort-header>Price</th><td mat-cell *matCellDef="let i">{{ m(i.unitPriceCents) }}</td></ng-container>
        <ng-container matColumnDef="margin"><th mat-header-cell *matHeaderCellDef>Margin</th><td mat-cell *matCellDef="let i">{{ m(i.unitPriceCents - i.costCents) }}</td></ng-container>
        <ng-container matColumnDef="tags"><th mat-header-cell *matHeaderCellDef>Tags</th><td mat-cell *matCellDef="let i">{{ i.tagsVerified ? 'verified' : 'hidden' }}</td></ng-container>
        <ng-container matColumnDef="stock"><th mat-header-cell *matHeaderCellDef mat-sort-header>Stock</th><td mat-cell *matCellDef="let i">{{ i.stock ?? '∞' }}</td></ng-container>
        <ng-container matColumnDef="soldOut">
          <th mat-header-cell *matHeaderCellDef>Sold out</th>
          <td mat-cell *matCellDef="let i"><mat-slide-toggle [checked]="i.soldOut" (change)="toggleSoldOut(i, $event.checked)" [aria-label]="'Sold out: ' + i.name" /></td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef><span class="visually-hidden">Actions</span></th>
          <td mat-cell *matCellDef="let i">
            <button mat-icon-button [matMenuTriggerFor]="menu" [attr.aria-label]="'Actions for ' + i.name"><mat-icon>more_vert</mat-icon></button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item (click)="edit(i)">Edit</button>
              <button mat-menu-item (click)="setActive(i, !i.active)">{{ i.active ? 'Deactivate (hide)' : 'Activate' }}</button>
            </mat-menu>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let r; columns: cols" [class.inactive]="!r.active"></tr>
      </table>
    </div>
    <mat-paginator [pageSizeOptions]="[10, 25, 50]" [pageSize]="25" showFirstLastButtons />
  `,
  styles: `
    .head { flex-wrap: wrap; } .small { font-size: 11px; }
    .table-wrap { overflow-x: auto; } table { width: 100%; background: transparent; }
    .inactive { opacity: .5; }
  `,
})
export class CatalogEditor {
  protected readonly data = inject(AdminData);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  protected readonly m = money;
  protected readonly cols = ['name', 'shelf', 'costCents', 'unitPriceCents', 'margin', 'tags', 'stock', 'soldOut', 'actions'];
  protected readonly ds = new MatTableDataSource<ItemRow>([]);
  private readonly rows = computed(() => this.data.items());

  @ViewChild(MatSort) set sort(s: MatSort) { this.ds.sort = s; }
  @ViewChild(MatPaginator) set paginator(p: MatPaginator) { this.ds.paginator = p; }

  constructor() { effect(() => { this.ds.data = this.rows(); }); }

  protected edit(item: ItemRow | null): void {
    this.dialog.open<ItemDialog, ItemRow | null, ItemRow | null>(ItemDialog, { data: item, autoFocus: 'first-tabbable' }).afterClosed().subscribe((r) => {
      if (r) void this.save([r], item ? 'Item saved' : 'Item added');
    });
  }

  protected toggleSoldOut(i: ItemRow, v: boolean): Promise<void> { return this.save([{ ...i, soldOut: v }], v ? `${i.name} marked sold out` : `${i.name} back in stock`); }
  protected setActive(i: ItemRow, v: boolean): Promise<void> { return this.save([{ ...i, active: v }], v ? 'Activated' : 'Hidden from shoppers'); }

  private async save(items: ItemRow[], msg: string): Promise<void> {
    try {
      assertPricingFloor(items);
      await this.data.api.adminSaveItems(items);
      await this.data.refresh();
      this.snack.open(msg, 'OK', { duration: 2500 });
    } catch (e) {
      this.snack.open(`Save failed: ${e instanceof Error ? e.message : e}`, 'OK', { duration: 6000 });
    }
  }

  protected async importCsv(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const { items, warnings } = catalogFromCsv(await file.text());
    if (!items.length) {
      this.dialog.open(NoticeDialog, { data: { title: 'Nothing to import', body: warnings.join('\n') || 'No rows had Include? = Y.' } });
      return;
    }
    const body = `${items.length} item(s) will be added or updated and every item not in the sheet will be hidden.` + (warnings.length ? `\n\nWarnings:\n${warnings.slice(0, 8).join('\n')}` : '');
    this.dialog.open<NoticeDialog, unknown, boolean>(NoticeDialog, { data: { title: 'Import catalog sheet', body, confirmLabel: 'Import', cancelLabel: 'Cancel' } }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      const ids = new Set(items.map((i) => i.id));
      const hidden = this.data.items().filter((i) => !ids.has(i.id) && i.active).map((i) => ({ ...i, active: false }));
      void this.save([...items, ...hidden], `Imported ${items.length} items`);
    });
  }
}
