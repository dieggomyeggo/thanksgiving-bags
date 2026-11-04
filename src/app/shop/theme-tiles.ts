import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { Doodle, type DoodleKind } from './doodle';
import type { StarterBag } from '@shared/types';

const ICONS: Record<string, { kind: DoodleKind; color: string }> = {
  'gym-bro': { kind: 'dumbbell', color: '#b5532a' },
  'busy-mom': { kind: 'bolt', color: '#e0a030' },
  'fresh-and-clean': { kind: 'sparkle', color: '#5f9a8a' },
  'thanksgiving-table': { kind: 'pie', color: '#d9701f' },
};

/** Theme tiles (variant B's idea inside variant A's layout): starter bags first, then "Build from scratch". */
@Component({
  selector: 'app-theme-tiles',
  imports: [MatCard, MatCardContent, Doodle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 id="themes">Start from a theme</h2>
    <div class="tiles" role="list" aria-labelledby="themes">
      @for (s of starters(); track s.id) {
        <button type="button" class="tile-btn" role="listitem" (click)="pick.emit(s)">
          <mat-card appearance="outlined" class="tile">
            <mat-card-content>
              <app-doodle [kind]="icon(s.id).kind" [size]="38" [style.color]="icon(s.id).color" />
              <h3>{{ s.name }}</h3>
              <div class="muted">{{ s.blurb }}</div>
            </mat-card-content>
          </mat-card>
        </button>
      }
      <button type="button" class="tile-btn" role="listitem" (click)="scratch.emit()">
        <mat-card appearance="outlined" class="tile">
          <mat-card-content>
            <app-doodle kind="gift" [size]="38" style="color:#a8421a" />
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
    app-doodle { margin-bottom: 4px; }
    .tile { background: var(--mat-sys-surface-container-low); }
  `,
})
export class ThemeTiles {
  readonly starters = input.required<StarterBag[]>();
  readonly pick = output<StarterBag>();
  readonly scratch = output<void>();
  protected icon = (id: string) => ICONS[id] ?? { kind: 'acorn' as DoodleKind, color: '#8a5a2b' };
}
