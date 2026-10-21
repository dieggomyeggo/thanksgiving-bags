import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import type { PublicItem } from '@shared/types';
import { money } from '../core/format';
import { QtyStepper } from './qty-stepper';
import { TagChips } from './tag-chips';

@Component({
  selector: 'app-item-card',
  imports: [MatCard, MatCardContent, QtyStepper, TagChips],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card appearance="outlined" class="item">
      <mat-card-content>
        <div class="name">{{ item().name }}</div>
        <div class="muted price">{{ price(item().unitPriceCents) }}</div>
        <app-tag-chips [tags]="item().tags" />
        <div class="stepper">
          <app-qty-stepper [value]="qty()" [label]="item().name" (inc)="inc.emit()" (dec)="dec.emit()" />
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .item { height: 100%; }
    .name { font-weight: 600; }
    .price { margin-bottom: 4px; }
    .stepper { margin-top: 6px; }
  `,
})
export class ItemCard {
  readonly item = input.required<PublicItem>();
  readonly qty = input.required<number>();
  readonly inc = output<void>();
  readonly dec = output<void>();
  protected readonly price = money;
}
