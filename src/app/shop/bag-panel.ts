import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { MatBadge } from '@angular/material/badge';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { MatDivider } from '@angular/material/divider';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { money } from '../core/format';
import { BagStore } from './bag.store';
import { CheckoutForm } from './checkout-form';
import { QtyStepper } from './qty-stepper';

@Component({
  selector: 'app-bag-panel',
  imports: [FormsModule, MatCard, MatCardContent, MatDivider, MatButton, MatBadge, MatFormField, MatLabel, MatSelect, MatOption, QtyStepper, CheckoutForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card appearance="outlined" id="bag">
      <mat-card-content>
        <h2>
          <span [matBadge]="s.count()" matBadgeOverlap="false" [matBadgeHidden]="s.count() === 0" matBadgeSize="small">Your bag</span>
        </h2>

        @for (l of s.bagLines(); track l.item.id) {
          <div class="line">
            <span class="ln">{{ l.item.name }}@if (l.flavor) { <span class="flavor"> · {{ l.flavor }}</span> } <span class="muted">{{ m(l.item.unitPriceCents) }}</span></span>
            <app-qty-stepper [value]="l.qty" [label]="l.item.name + (l.flavor ? ' ' + l.flavor : '')" (inc)="s.inc(l.key)" (dec)="s.dec(l.key)" />
          </div>
        } @empty {
          <p class="muted">Your bag is empty. Pick a theme or add items from a shelf.</p>
        }
        <p class="muted small">Every order includes a free handwritten thank-you card.</p>

        @if (s.freeCount() > 0) {
          <div class="free" role="group" aria-labelledby="free-h">
            <b id="free-h">Your {{ s.freeCount() }} free extras (from Cozy extras, your choice)</b>
            @if (s.nextFreeAt(); as next) { <p class="muted small">Add {{ next - s.count() }} more {{ next - s.count() === 1 ? 'item' : 'items' }} for another free extra.</p> }
            @for (slot of s.freeSlots(); track $index) {
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Free extra {{ $index + 1 }}</mat-label>
                <mat-select [ngModel]="slot" (ngModelChange)="pickFree($index, $event)" [name]="'free' + $index">
                  <mat-option value="">Choose…</mat-option>
                  @for (o of s.freeOptions(); track o.key) { <mat-option [value]="o.key">{{ o.label }}</mat-option> }
                </mat-select>
              </mat-form-field>
            }
          </div>
        } @else {
          <p class="muted small">Add {{ s.settings().minItems - s.count() }} more {{ s.settings().minItems - s.count() === 1 ? 'item' : 'items' }} to unlock {{ s.settings().freeItemCount }} free extras.</p>
        }

        @if (s.bonusCount() > 0) {
          <div class="free" role="group" aria-labelledby="bonus-h">
            <b id="bonus-h">{{ s.bonusCount() === 1 ? 'Pick 1 free item' : 'Pick ' + s.bonusCount() + ' free items' }} (each {{ m(s.settings().bonusMaxItemCents) }} or less)</b>
            @for (slot of s.bonusSlots(); track $index) {
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Free item {{ $index + 1 }}</mat-label>
                <mat-select [ngModel]="slot" (ngModelChange)="pickBonus($index, $event)" [name]="'bonus' + $index">
                  <mat-option value="">None</mat-option>
                  @for (o of s.bonusOptions(); track o.key) { <mat-option [value]="o.key">{{ o.label }} ({{ m(o.item.unitPriceCents) }} value)</mat-option> }
                </mat-select>
              </mat-form-field>
            }
          </div>
        }
        @if (s.nextBonusAtCents(); as nb) {
          <p class="muted small">Spend {{ m(nb - s.subtotal()) }} more to earn {{ s.bonusCount() === 0 ? 'a free item' : 'another free item' }}.</p>
        }

        <div class="totals" aria-live="polite">
          <div class="row"><span>Items ({{ s.count() }})</span><span>{{ m(s.subtotal()) }}</span></div>
          <div class="row"><span class="muted">{{ s.quote().label }}</span><span>{{ s.quote().cents === null ? '—' : m(s.quote().cents!) }}</span></div>
          <div class="row total"><b>Total</b><b>{{ s.quote().kind === 'quote' ? m(s.total()) + ' + shipping' : s.quote().cents === null ? '—' : m(s.total()) }}</b></div>
        </div>

        @if (s.large()) {
          <div class="notice warn" role="status">Large order: I'll confirm availability{{ s.method() === 'ship' ? ' and shipping' : '' }} with you before you pay.</div>
        }
        @if (s.late()) {
          <div class="notice warn" role="status">Heads up: {{ s.lateText() }}</div>
        }

        <mat-divider />
        <app-checkout-form />

        @if (s.placeError()) { <div class="notice err" role="alert">{{ s.placeError() }}</div> }
        @if (s.problems().length) {
          <ul class="problems muted" aria-label="Still needed">
            @for (p of s.problems(); track p) { <li>{{ p }}</li> }
          </ul>
        }
        <button mat-flat-button class="place" type="button" (click)="place.emit()" [disabled]="s.placing() || s.problems().length > 0">
          {{ s.placing() ? 'Placing order…' : 'Place order' }}
        </button>
        <p class="muted small">You'll get an order number and payment steps next. Nothing is charged on this site.</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    :host { display: block; }
    .line { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .ln { flex: 1; }
    .flavor { font-weight: 600; color: var(--mat-sys-primary); }
    .small { font-size: 12px; }
    .free { display: flex; flex-direction: column; gap: 6px; margin: 8px 0; padding: 10px; border-radius: 12px; background: var(--mat-sys-surface-container-high); }
    .totals { border-top: 1px solid var(--mat-sys-outline-variant); margin: 8px 0; padding-top: 8px; }
    .total { margin-top: 4px; }
    mat-divider { margin: 12px 0; }
    .problems { margin: 8px 0; padding-left: 18px; font-size: 13px; }
    .place { width: 100%; margin: 8px 0; height: 48px; }
  `,
})
export class BagPanel {
  protected readonly s = inject(BagStore);
  protected readonly m = money;
  readonly place = output<void>();

  protected pickBonus(i: number, id: string): void {
    const next = [...this.s.bonusSlots()];
    next[i] = id;
    this.s.bonusPicks.set(next);
  }
  protected pickFree(i: number, id: string): void {
    this.s.freePicks.set(this.withSlot(i, id));
  }
  private withSlot(i: number, id: string): string[] {
    const next = [...this.s.freeSlots()];
    next[i] = id;
    return next;
  }
}
