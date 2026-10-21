import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatListItem, MatNavList } from '@angular/material/list';

@Component({
  selector: 'app-shelf-nav',
  imports: [MatNavList, MatListItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Shelves">
      <div class="muted label">Shelves</div>
      <mat-nav-list>
        @for (s of shelves(); track s) {
          <a mat-list-item href="#" (click)="$event.preventDefault(); select.emit(s)" [activated]="s === active()" [attr.aria-current]="s === active() ? 'true' : null">{{ s }}</a>
        }
      </mat-nav-list>
    </nav>
  `,
  styles: `
    .label { padding: 0 16px 4px; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
    @media (max-width: 860px) {
      mat-nav-list { display: flex; overflow-x: auto; gap: 4px; padding: 0 0 6px; }
      mat-nav-list a { flex: 0 0 auto; width: auto; white-space: nowrap; border-radius: 20px; }
    }
  `,
})
export class ShelfNav {
  readonly shelves = input.required<string[]>();
  readonly active = input.required<string>();
  readonly select = output<string>();
}
