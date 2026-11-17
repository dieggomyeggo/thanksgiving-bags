import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect, MatOption } from '@angular/material/select';
import { lineKey, splitKey } from '@shared/cart';
import type { PublicItem } from '@shared/types';
import { money } from '../core/format';
import { QtyStepper } from './qty-stepper';
import { TagChips } from './tag-chips';

@Component({
  selector: 'app-item-card',
  imports: [MatCard, MatCardContent, MatFormField, MatLabel, MatSelect, MatOption, QtyStepper, TagChips],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card appearance="outlined" class="item">
      @if (image()) {
        <img class="photo" [src]="image()" [alt]="item().name" loading="lazy" width="400" height="300">
      }
      <mat-card-content>
        <div class="name">{{ item().name }}</div>
        <div class="muted price">{{ price(item().unitPriceCents) }}</div>
        @if (link()) {
          <a class="more" [href]="link()" target="_blank" rel="noopener noreferrer">See details{{ item().kind === 'amway' ? ' on Amway' : '' }} ↗</a>
        }
        <app-tag-chips [tags]="item().tags" />
        @if (flavors().length) {
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="flavor">
            <mat-label>Pick flavor</mat-label>
            <mat-select [value]="flavor()" (valueChange)="flavor.set($event)" [attr.aria-label]="'Flavor for ' + item().name">
              @for (f of flavors(); track f) { <mat-option [value]="f">{{ f }}</mat-option> }
            </mat-select>
          </mat-form-field>
          @if (inBag().length) {
            <div class="muted small">In your bag: @for (b of inBag(); track b.flavor; let last = $last) { {{ b.flavor }} × {{ b.qty }}{{ last ? '' : ', ' }} }</div>
          }
        }
        <div class="stepper">
          @if (flavors().length && !flavor()) {
            <span class="muted small">Choose a flavor to add</span>
          } @else {
            <app-qty-stepper [value]="qty()" [label]="item().name + (flavor() ? ' ' + flavor() : '')" (inc)="inc.emit(key())" (dec)="dec.emit(key())" />
          }
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .item { height: 100%; overflow: hidden; }
    .photo { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: var(--mat-sys-surface-container-high); }
    .more { font-size: 13px; display: inline-block; margin: 2px 0 4px; }
    .name { font-weight: 600; }
    .price { margin-bottom: 4px; }
    .flavor { width: 100%; margin-top: 6px; }
    .small { font-size: 12px; margin-top: 4px; }
    .stepper { margin-top: 6px; }
  `,
})
export class ItemCard {
  readonly item = input.required<PublicItem>();
  /** The whole bag, keyed by `id` or `id@@Flavor`. */
  readonly lines = input.required<Record<string, number>>();
  readonly inc = output<string>();
  readonly dec = output<string>();
  protected readonly price = money;
  protected readonly image = computed(() => (/^(https:\/\/|data:image\/)/.test(this.item().imageUrl ?? '') ? this.item().imageUrl! : ''));
  protected readonly link = computed(() => (/^https:\/\//.test(this.item().productUrl ?? '') ? this.item().productUrl! : ''));
  protected readonly flavor = signal('');
  protected readonly flavors = computed(() => this.item().flavors ?? []);
  protected readonly key = computed(() => lineKey(this.item().id, this.flavor()));
  protected readonly qty = computed(() => this.lines()[this.key()] ?? 0);
  protected readonly inBag = computed(() =>
    Object.entries(this.lines()).flatMap(([k, qty]) => {
      const s = splitKey(k);
      return s.id === this.item().id && s.flavor ? [{ flavor: s.flavor, qty }] : [];
    }),
  );
}
