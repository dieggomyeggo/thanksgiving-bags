import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import type { StarterBag } from '@shared/types';

const ICONS: Record<string, string> = {
  'gym-bro': 'fitness_center',
  'busy-mom': 'directions_run',
  'golden-years': 'local_cafe',
  'thanksgiving-table': 'restaurant',
};

/** Theme tiles (variant B's idea inside variant A's layout): starter bags first, then "Build from scratch". */
@Component({
  selector: 'app-theme-tiles',
  imports: [MatCard, MatCardContent, MatIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 id="themes">Start from a theme</h2>
    <div class="tiles" role="list" aria-labelledby="themes">
      @for (s of starters(); track s.id) {
        <button type="button" class="tile-btn" role="listitem" (click)="pick.emit(s)">
          <mat-card appearance="outlined" class="tile">
            <mat-card-content>
              <mat-icon aria-hidden="true">{{ icon(s.id) }}</mat-icon>
              <h3>{{ s.name }}</h3>
              <div class="muted">{{ s.blurb }}</div>
            </mat-card-content>
          </mat-card>
        </button>
      }
      <button type="button" class="tile-btn" role="listitem" (click)="scratch.emit()">
        <mat-card appearance="outlined" class="tile">
          <mat-card-content>
            <mat-icon aria-hidden="true">add_circle</mat-icon>
            <h3>Build from scratch</h3>
            <div class="muted">Go as big as you like</div>
          </mat-card-content>
        </mat-card>
      </button>
    </div>
  `,
  styles: `
    .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; margin-bottom: 18px; }
    .tile-btn { all: unset; display: block; cursor: pointer; border-radius: 12px; }
    .tile-btn:focus-visible { outline: 3px solid var(--mat-sys-primary); outline-offset: 2px; }
    .tile { height: 100%; transition: border-color .15s; }
    .tile-btn:hover .tile { border-color: var(--mat-sys-primary); }
    h3 { margin: 4px 0 2px; font-size: 1rem; }
    mat-icon { color: var(--mat-sys-primary); }
  `,
})
export class ThemeTiles {
  readonly starters = input.required<StarterBag[]>();
  readonly pick = output<StarterBag>();
  readonly scratch = output<void>();
  protected icon = (id: string) => ICONS[id] ?? 'card_giftcard';
}
