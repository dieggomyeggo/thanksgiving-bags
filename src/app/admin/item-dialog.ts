import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { slug } from '@shared/catalog-csv';
import { floorOk, unitPriceCents } from '@shared/pricing';
import { SHELVES } from '@shared/shelves';
import type { ItemRow } from '@shared/types';
import { dollarsToCents, money } from '../core/format';

@Component({
  selector: 'app-item-dialog',
  imports: [FormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton, MatFormField, MatLabel, MatHint, MatInput, MatSelect, MatOption, MatCheckbox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ isNew ? 'Add item' : 'Edit item' }}</h2>
    <mat-dialog-content class="grid">
      <mat-form-field appearance="outline" class="wide"><mat-label>Name</mat-label><input matInput [(ngModel)]="name" name="name"></mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Shelf</mat-label>
        <mat-select [(ngModel)]="shelf" name="shelf">@for (s of shelves; track s) { <mat-option [value]="s">{{ s }}</mat-option> }</mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Kind</mat-label>
        <mat-select [(ngModel)]="kind" name="kind"><mat-option value="amway">Amway</mat-option><mat-option value="other">Other</mat-option></mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Your cost per unit ($)</mat-label><input matInput inputmode="decimal" [(ngModel)]="cost" name="cost"><mat-hint>Never shown to shoppers</mat-hint></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Retail per unit ($)</mat-label><input matInput inputmode="decimal" [(ngModel)]="retail" name="retail"></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Units per box</mat-label><input matInput type="number" min="1" [(ngModel)]="boxSize" name="box"></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Weight (lb)</mat-label><input matInput type="number" step="0.05" min="0" [(ngModel)]="weight" name="weight"></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>PV per unit</mat-label><input matInput type="number" step="0.01" [(ngModel)]="pv" name="pv"></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>BV per unit</mat-label><input matInput type="number" step="0.01" [(ngModel)]="bv" name="bv"></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Stock (blank = unlimited)</mat-label><input matInput type="number" min="0" [(ngModel)]="stock" name="stock"></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Sort</mat-label><input matInput type="number" [(ngModel)]="sort" name="sort"></mat-form-field>

      <mat-form-field appearance="outline" class="wide"><mat-label>Flavors (separate with commas; leave blank if none)</mat-label><input matInput [(ngModel)]="flavors" name="flavors" placeholder="Citrus, Berry, Tropical"><mat-hint>Shoppers must pick one. Your Amway order list is split per flavor.</mat-hint></mat-form-field>

      <div class="wide price" [class.bad]="!ok()" aria-live="polite">
        Price: <b>{{ priceText() }}</b> · margin {{ marginText() }}
        @if (!ok()) { <b> · below the pricing floor!</b> } @else { <span class="muted"> · floor OK (covers 3% fee and the 25%/$0.50 buffer)</span> }
      </div>

      <h3 class="wide">Tags (shown only after you check the physical label)</h3>
      <mat-form-field appearance="outline"><mat-label>Caffeine mg (0 = caffeine-free)</mat-label><input matInput type="number" min="0" [(ngModel)]="caffeine" name="caf"></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>NSF type</mat-label><input matInput [(ngModel)]="nsf" name="nsf"></mat-form-field>
      <mat-form-field appearance="outline" class="wide"><mat-label>Allergens incl. nuts (comma-separated)</mat-label><input matInput [(ngModel)]="allergens" name="allergens"></mat-form-field>
      <mat-checkbox [(ngModel)]="sugarFree" name="sf">Sugar-free</mat-checkbox>
      <mat-checkbox [(ngModel)]="organic" name="org">Organic</mat-checkbox>
      <mat-checkbox [(ngModel)]="vegan" name="vegan">Vegan</mat-checkbox>
      <mat-checkbox [(ngModel)]="wrapped" name="wrapped">Individually wrapped</mat-checkbox>
      <mat-checkbox [(ngModel)]="verified" name="verified" class="wide">Tags verified against the label (show them to shoppers)</mat-checkbox>
      <mat-checkbox [(ngModel)]="soldOut" name="soldOut">Sold out</mat-checkbox>
      <mat-checkbox [(ngModel)]="active" name="active">Active (listed)</mat-checkbox>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Cancel</button>
      <button mat-flat-button type="button" (click)="save()" [disabled]="!valid()">Save</button>
    </mat-dialog-actions>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; min-width: min(560px, 80vw); }
    .wide { grid-column: 1 / -1; }
    .price { padding: 8px 12px; border-radius: 8px; background: var(--mat-sys-surface-container-high); margin-bottom: 8px; }
    .price.bad { background: light-dark(#f8d9d4, #5a2420); }
  `,
})
export class ItemDialog {
  private readonly ref = inject<MatDialogRef<ItemDialog, ItemRow | null>>(MatDialogRef);
  private readonly src = inject<ItemRow | null>(MAT_DIALOG_DATA);
  protected readonly isNew = !this.src;
  protected readonly shelves = SHELVES as readonly string[];

  protected readonly name = signal(this.src?.name ?? '');
  protected readonly shelf = signal(this.src?.shelf ?? SHELVES[0]);
  protected readonly kind = signal(this.src?.kind ?? 'amway');
  protected readonly cost = signal(this.src ? (this.src.costCents / 100).toFixed(2) : '');
  protected readonly retail = signal(this.src?.retailCents != null ? (this.src.retailCents / 100).toFixed(2) : '');
  protected readonly boxSize = signal(this.src?.boxSize ?? 1);
  protected readonly weight = signal(this.src?.weightLb ?? 0.2);
  protected readonly pv = signal<number | null>(this.src?.pv ?? null);
  protected readonly bv = signal<number | null>(this.src?.bv ?? null);
  protected readonly stock = signal<number | null>(this.src?.stock ?? null);
  protected readonly sort = signal(this.src?.sort ?? 100);
  protected readonly flavors = signal((this.src?.flavors ?? []).join(', '));
  protected readonly caffeine = signal<number | null>(this.src?.tags.caffeineMg ?? null);
  protected readonly nsf = signal(this.src?.tags.nsf ?? '');
  protected readonly allergens = signal((this.src?.tags.allergens ?? []).join(', '));
  protected readonly sugarFree = signal(!!this.src?.tags.sugarFree);
  protected readonly organic = signal(!!this.src?.tags.organic);
  protected readonly vegan = signal(!!this.src?.tags.vegan);
  protected readonly wrapped = signal(this.src?.individuallyWrapped ?? true);
  protected readonly verified = signal(this.src?.tagsVerified ?? false);
  protected readonly soldOut = signal(this.src?.soldOut ?? false);
  protected readonly active = signal(this.src?.active ?? true);

  private readonly costCents = computed(() => dollarsToCents(this.cost()));
  protected readonly price = computed(() => { const c = this.costCents(); return c === null || c < 0 ? null : unitPriceCents(c, dollarsToCents(this.retail())); });
  protected readonly priceText = computed(() => (this.price() === null ? '—' : money(this.price()!)));
  protected readonly marginText = computed(() => (this.price() === null ? '—' : money(this.price()! - this.costCents()!)));
  protected readonly ok = computed(() => this.price() === null || floorOk(this.costCents()!, this.price()!));
  protected readonly valid = computed(() => !!this.name().trim() && this.price() !== null && this.ok() && this.boxSize() >= 1);

  protected save(): void {
    const tags: ItemRow['tags'] = {};
    if (this.caffeine() !== null && this.caffeine() !== undefined && `${this.caffeine()}` !== '') tags.caffeineMg = Number(this.caffeine());
    if (this.sugarFree()) tags.sugarFree = true;
    if (this.organic()) tags.organic = true;
    if (this.vegan()) tags.vegan = true;
    if (this.nsf().trim()) tags.nsf = this.nsf().trim();
    const al = this.allergens().split(',').map((x) => x.trim()).filter(Boolean);
    if (al.length) tags.allergens = al;
    const cents = this.costCents()!;
    const num = (v: number | null) => (v === null || v === undefined || `${v}` === '' ? null : Number(v));
    this.ref.close({
      id: this.src?.id ?? slug(this.name()), shelf: this.shelf(), name: this.name().trim(), kind: this.kind(),
      costCents: cents, retailCents: dollarsToCents(this.retail()), pv: num(this.pv()), bv: num(this.bv()),
      weightLb: Number(this.weight()), boxSize: Math.max(1, Math.round(Number(this.boxSize()))), tags, tagsVerified: this.verified(),
      individuallyWrapped: this.wrapped(), stock: num(this.stock()), soldOut: this.soldOut(), active: this.active(),
      sort: Number(this.sort()), unitPriceCents: this.price()!,
      flavors: [...new Set(this.flavors().split(',').map((x) => x.trim().replace(/@@/g, '')).filter(Boolean))],
    });
  }
}
