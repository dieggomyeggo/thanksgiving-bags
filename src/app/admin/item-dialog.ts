import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { ApiService } from '../core/api.service';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { slug } from '@shared/catalog-csv';
import { floorOk, unitPriceCents } from '@shared/pricing';
import { SHELVES } from '@shared/shelves';
import type { ItemRow } from '@shared/types';
import { dollarsToCents, money } from '../core/format';

@Component({
  selector: 'app-item-dialog',
  imports: [FormsModule, MatError, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton, MatFormField, MatLabel, MatHint, MatInput, MatSelect, MatOption, MatCheckbox],
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

      <div class="wide photo">
        <h3>Photo and product link</h3>
        <div class="photo-row">
          <div class="thumb">@if (imageUrl()) { <img [src]="imageUrl()" alt="Current photo"> } @else { <span class="muted">No photo</span> }</div>
          <div class="photo-actions">
            <button mat-stroked-button type="button" (click)="file.click()" [disabled]="uploading() || !name().trim()">{{ uploading() ? 'Uploading…' : imageUrl() ? 'Replace photo' : 'Add photo' }}</button>
            <input #file type="file" accept="image/*" class="visually-hidden" (change)="pick($event)" aria-label="Choose a photo for this item">
            @if (imageUrl()) { <button mat-button type="button" (click)="imageUrl.set('')">Remove photo</button> }
            @if (!name().trim()) { <span class="muted small">Enter the name first.</span> }
            @if (uploadError()) { <span class="err small" role="alert">{{ uploadError() }}</span> }
          </div>
        </div>
        <mat-form-field appearance="outline" class="wide"><mat-label>Product link (https://…)</mat-label><input matInput [(ngModel)]="productUrl" name="productUrl" inputmode="url" placeholder="https://www.amway.com/en_US/…"><mat-hint>Shoppers see "See details" linking here, in a new tab.</mat-hint>@if (!linkOk()) { <mat-error>Must start with https://</mat-error> }</mat-form-field>
      </div>

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
      <mat-checkbox [(ngModel)]="kosher" name="kosher">Kosher certified</mat-checkbox>
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
    .photo h3 { margin: 4px 0 8px; font-size: 1rem; }
    .photo-row { display: flex; gap: 14px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
    .thumb { width: 120px; height: 90px; border-radius: 10px; background: var(--mat-sys-surface-container-high); display: grid; place-items: center; overflow: hidden; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .photo-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .small { font-size: 12px; } .err { color: var(--mat-sys-error); }
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
  private readonly api = inject(ApiService);
  protected readonly imageUrl = signal(this.src?.imageUrl ?? '');
  protected readonly productUrl = signal(this.src?.productUrl ?? '');
  protected readonly uploading = signal(false);
  protected readonly uploadError = signal('');
  protected readonly linkOk = computed(() => !this.productUrl().trim() || /^https:\/\/\S+$/.test(this.productUrl().trim()));
  protected readonly flavors = signal((this.src?.flavors ?? []).join(', '));
  protected readonly caffeine = signal<number | null>(this.src?.tags.caffeineMg ?? null);
  protected readonly nsf = signal(this.src?.tags.nsf ?? '');
  protected readonly allergens = signal((this.src?.tags.allergens ?? []).join(', '));
  protected readonly sugarFree = signal(!!this.src?.tags.sugarFree);
  protected readonly organic = signal(!!this.src?.tags.organic);
  protected readonly vegan = signal(!!this.src?.tags.vegan);
  protected readonly kosher = signal(!!this.src?.tags.kosher);
  protected readonly wrapped = signal(this.src?.individuallyWrapped ?? true);
  protected readonly verified = signal(this.src?.tagsVerified ?? false);
  protected readonly soldOut = signal(this.src?.soldOut ?? false);
  protected readonly active = signal(this.src?.active ?? true);

  private readonly costCents = computed(() => dollarsToCents(this.cost()));
  protected readonly price = computed(() => { const c = this.costCents(); return c === null || c < 0 ? null : unitPriceCents(c, dollarsToCents(this.retail())); });
  protected readonly priceText = computed(() => (this.price() === null ? '—' : money(this.price()!)));
  protected readonly marginText = computed(() => (this.price() === null ? '—' : money(this.price()! - this.costCents()!)));
  protected readonly ok = computed(() => this.price() === null || floorOk(this.costCents()!, this.price()!));
  protected readonly valid = computed(() => !!this.name().trim() && this.price() !== null && this.ok() && this.boxSize() >= 1 && this.linkOk() && !this.uploading());

  /** Shrinks the chosen photo to at most 900px on its long side (JPEG) before upload, so pages stay fast. */
  protected async pick(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploadError.set('');
    this.uploading.set(true);
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not process the photo.'))), 'image/jpeg', 0.85));
      this.imageUrl.set(await this.api.adminUploadItemImage(this.src?.id ?? slug(this.name()), blob));
    } catch (e) {
      this.uploadError.set(e instanceof Error ? e.message : 'Upload failed. Try a different photo.');
    } finally {
      this.uploading.set(false);
    }
  }

  protected save(): void {
    const tags: ItemRow['tags'] = {};
    if (this.caffeine() !== null && this.caffeine() !== undefined && `${this.caffeine()}` !== '') tags.caffeineMg = Number(this.caffeine());
    if (this.sugarFree()) tags.sugarFree = true;
    if (this.organic()) tags.organic = true;
    if (this.vegan()) tags.vegan = true;
    if (this.kosher()) tags.kosher = true;
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
      imageUrl: this.imageUrl().trim() || null,
      productUrl: this.productUrl().trim() || null,
      flavors: [...new Set(this.flavors().split(',').map((x) => x.trim().replace(/@@/g, '')).filter(Boolean))],
    });
  }
}
