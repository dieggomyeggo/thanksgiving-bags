import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { paymentInstructions } from '@shared/emails';
import { charityLabel } from '@shared/settings';
import { lateNotice } from '@shared/cutoffs';
import { money } from '../core/format';
import { BagStore } from './bag.store';

@Component({
  selector: 'app-order-confirmation',
  imports: [MatCard, MatCardContent, MatButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (c(); as o) {
      <div class="wrap narrow">
        <h1>Thank you, {{ o.name }}!</h1>
        <mat-card appearance="outlined">
          <mat-card-content>
            <div class="notice"><b>Order {{ o.number }}</b></div>
            @for (l of o.lines; track l.name) {
              <div class="row"><span>{{ l.qty }}× {{ l.name }}</span><span>{{ m(l.totalCents) }}</span></div>
            }
            <div class="row"><span>Items</span><span>{{ m(o.subtotalCents) }}</span></div>
            <div class="row"><span>Delivery/shipping</span><span>{{ o.shippingQuoteNeeded ? 'to be quoted' : m(o.shippingCents) }}</span></div>
            <div class="row"><b>Total</b><b>{{ m(o.totalCents) }}{{ o.shippingQuoteNeeded ? ' + shipping' : '' }}</b></div>

            <h2 class="next">Next: pay</h2>
            @if (o.needsApproval) {
              <p>{{ o.shippingQuoteNeeded ? "Your order needs a shipping quote." : "Your order is on the larger side." }} I'll email or text you to confirm and send payment steps. <b>Please don't pay yet.</b></p>
            } @else {
              <p>{{ pay() }} Put <b>{{ o.number }}</b> in the memo. Unpaid orders are released after {{ s.settings().unpaidExpiryHours }} hours{{ o.payMethod === 'cash' ? ' (cash orders are confirmed by text instead)' : '' }}.</p>
            }
            @if (o.late) { <div class="notice warn">{{ late() }}</div> }
            <p class="muted">A confirmation email with this summary is on its way. You'll get a "paid" email, then a "ready" email with your window. 100% of my profit from these bags, plus the Amway bonus I earn from them, goes to {{ charity() }}.</p>
            <button mat-flat-button type="button" (click)="done.emit()">Start another bag</button>
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: `.narrow { max-width: 620px; } .next { margin-top: 18px; }`,
})
export class OrderConfirmation {
  protected readonly s = inject(BagStore);
  protected readonly m = money;
  protected readonly c = this.s.confirmation;
  readonly done = output<void>();
  protected readonly pay = computed(() => {
    const o = this.c();
    return o ? paymentInstructions(o.payMethod, o.number, this.s.settings()) : '';
  });
  protected readonly late = computed(() => { const o = this.c(); return o ? lateNotice(o.method, this.s.settings()) : ''; });
  protected readonly charity = computed(() => charityLabel(this.s.settings()));
}
