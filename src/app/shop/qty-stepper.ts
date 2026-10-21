import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-qty-stepper',
  imports: [MatIconButton, MatIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="qty" role="group" [attr.aria-label]="label() + ' quantity'">
      <button mat-icon-button type="button" (click)="dec.emit()" [disabled]="value() === 0" [attr.aria-label]="'Remove one ' + label()">
        <mat-icon>remove</mat-icon>
      </button>
      <b aria-live="polite">{{ value() }}</b>
      <button mat-icon-button type="button" (click)="inc.emit()" [disabled]="value() >= 99" [attr.aria-label]="'Add one ' + label()">
        <mat-icon>add</mat-icon>
      </button>
    </span>
  `,
  styles: `
    .qty { display: inline-flex; align-items: center; gap: 2px; }
    b { min-width: 22px; text-align: center; font-variant-numeric: tabular-nums; }
  `,
})
export class QtyStepper {
  readonly value = input.required<number>();
  readonly label = input('item');
  readonly inc = output<void>();
  readonly dec = output<void>();
}
