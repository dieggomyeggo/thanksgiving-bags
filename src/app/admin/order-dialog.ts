import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { STATUS_LABELS } from '@shared/orders';
import type { ItemRow, OrderRow } from '@shared/types';
import { dollarsToCents, money } from '../core/format';

export interface OrderDialogData {
  order: OrderRow;
  items: ItemRow[];
  /** When set, the dialog is the "mark Packed" step: window and tracking are collected before the ready email. */
  readyStep?: boolean;
}
export type OrderDialogResult = Partial<OrderRow> | null;

@Component({
  selector: 'app-order-dialog',
  imports: [FormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton, MatFormField, MatLabel, MatHint, MatInput, MatCheckbox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ d.readyStep ? 'Mark packed and email "ready"' : 'Order ' + o.number }}</h2>
    <mat-dialog-content>
      <p class="muted">{{ status(o.status) }} · {{ o.method }} · {{ o.payMethod }} · placed {{ o.createdAt.slice(0, 16).replace('T', ' ') }}</p>
      @if (!d.readyStep) {
        <p>
          <b>{{ o.name ?? '(purged)' }}</b> · {{ o.email ?? '' }} {{ o.phone ? '· ' + o.phone : '' }}<br>
          {{ o.address ?? '' }} {{ o.zip ?? '' }}
        </p>
        <ul class="lines">
          @for (l of o.lines; track l.itemId + l.flavor + l.free) { <li>{{ l.qty }}× {{ name(l.itemId) }}{{ l.flavor ? ' (' + l.flavor + ')' : '' }} <span class="muted">{{ l.free ? 'FREE extra' : m(l.unitPriceCents) + ' ea' }}, cost {{ m(l.unitCostCents) }}</span></li> }
        </ul>
        <p>Items {{ m(o.subtotalCents) }} · shipping {{ o.shippingQuoteNeeded ? 'TO QUOTE' : m(o.shippingCents) }} · total {{ m(o.totalCents) }}
          {{ o.optFollowup ? '· follow-up OK' : '' }} {{ o.optShoutout ? '· announce name OK' : '' }}</p>
      }
      <mat-form-field appearance="outline" class="full"><mat-label>{{ o.method === 'ship' ? 'Expected ship/arrive window' : 'Delivery/pickup window' }}</mat-label><input matInput [(ngModel)]="window" name="window"><mat-hint>Included in the "ready" email</mat-hint></mat-form-field>
      @if (o.method === 'ship') {
        <mat-form-field appearance="outline" class="full"><mat-label>USPS tracking number</mat-label><input matInput [(ngModel)]="tracking" name="tracking"></mat-form-field>
      }
      @if (!d.readyStep) {
        @if (o.shippingQuoteNeeded) {
          <mat-form-field appearance="outline" class="full"><mat-label>Quoted shipping ($)</mat-label><input matInput inputmode="decimal" [(ngModel)]="quote" name="quote"><mat-hint>Sets the shipping and total for this order</mat-hint></mat-form-field>
        }
        <mat-form-field appearance="outline" class="full"><mat-label>Notes (substitutions, refunds)</mat-label><textarea matInput rows="2" [(ngModel)]="notes" name="notes"></textarea></mat-form-field>
        <mat-form-field appearance="outline" class="full"><mat-label>Refund / adjustment ($, negative reduces profit)</mat-label><input matInput inputmode="decimal" [(ngModel)]="adjustment" name="adj"><mat-hint>e.g. -3.25 when you refund an item's price</mat-hint></mat-form-field>
        <mat-checkbox [(ngModel)]="test" name="test">TEST order (excluded from rollup and donation; deletable)</mat-checkbox>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Cancel</button>
      <button mat-flat-button type="button" (click)="save()">{{ d.readyStep ? 'Mark packed and email' : 'Save' }}</button>
    </mat-dialog-actions>
  `,
  styles: `.full { width: 100%; } .lines { margin: 0 0 8px; padding-left: 18px; } mat-dialog-content { min-width: min(520px, 80vw); }`,
})
export class OrderDialog {
  protected readonly d = inject<OrderDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<OrderDialog, OrderDialogResult>>(MatDialogRef);
  protected readonly o = this.d.order;
  protected readonly m = money;
  protected readonly status = (s: OrderRow['status']) => STATUS_LABELS[s];
  protected readonly window = signal(this.o.readyWindow ?? '');
  protected readonly tracking = signal(this.o.tracking ?? '');
  protected readonly notes = signal(this.o.notes ?? '');
  protected readonly adjustment = signal(this.o.adjustmentCents ? (this.o.adjustmentCents / 100).toFixed(2) : '');
  protected readonly quote = signal('');
  protected readonly test = signal(this.o.test);
  private readonly names = computed(() => new Map(this.d.items.map((i) => [i.id, i.name])));
  protected name = (id: string) => this.names().get(id) ?? id;

  protected save(): void {
    const patch: Partial<OrderRow> = { readyWindow: this.window().trim() || null, tracking: this.tracking().trim() || null };
    if (!this.d.readyStep) {
      patch.notes = this.notes().trim() || null;
      patch.adjustmentCents = dollarsToCents(this.adjustment()) ?? 0;
      patch.test = this.test();
      const q = dollarsToCents(this.quote());
      if (this.o.shippingQuoteNeeded && q !== null && q >= 0) {
        patch.shippingCents = q;
        patch.totalCents = this.o.subtotalCents + q;
        patch.shippingQuoteNeeded = false;
      }
    }
    this.ref.close(patch);
  }
}
