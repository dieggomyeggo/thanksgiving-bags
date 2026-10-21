import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { charityLabel, DEFAULT_SETTINGS } from '@shared/settings';
import type { Settings } from '@shared/types';
import { ApiService } from '../core/api.service';
import { money } from '../core/format';

@Component({
  selector: 'app-totals-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap narrow">
      <h1>Donation totals</h1>
      @if (s().totals.published) {
        <p>Thanks to everyone who ordered a bag. Here is what was donated to {{ charity() }}:</p>
        <ul>
          <li>Profit from bag sales: <b>{{ m(s().totals.profitCents) }}</b></li>
          <li>Share of my Amway bonus earned from these bags: <b>{{ m(s().totals.bonusCents) }}</b></li>
          <li>Total donated: <b>{{ m(s().totals.profitCents + s().totals.bonusCents) }}</b></li>
        </ul>
        <p class="muted">Profit is the bag price minus my cost for the items sold; shipping is excluded. The bonus share is calculated after month-end from my Amway statement. Updated {{ updated() }}.</p>
      } @else {
        <p>Totals will be posted here after the promotion ends and the bonus is calculated.</p>
      }
      <p><a routerLink="/">← Back</a></p>
    </div>
  `,
  styles: `.narrow { max-width: 640px; }`,
})
export class TotalsPage {
  private readonly api = inject(ApiService);
  protected readonly s = signal<Settings>(DEFAULT_SETTINGS);
  protected readonly m = money;
  protected readonly charity = computed(() => charityLabel(this.s()));
  protected readonly updated = computed(() => this.s().totals.updatedAt?.slice(0, 10) ?? '');
  constructor() { void this.api.getSettings().then((x) => this.s.set(x)); }
}
