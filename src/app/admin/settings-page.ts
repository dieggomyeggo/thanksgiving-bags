import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { bonusShareCents, donationCents, profitCents, promoBv } from '@shared/donation';
import { normalizeZip } from '@shared/zip';
import type { Settings, ZipRow } from '@shared/types';
import { dollarsToCents, money } from '../core/format';
import { NoticeDialog } from '../shop/notice-dialog';
import { AdminData } from './admin-data';

const toDate = (ymd: string) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d); };
const toYmd = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '');
const zipText = (z: ZipRow[], zone: 'near' | 'far') => z.filter((x) => x.zone === zone).map((x) => x.zip).join(' ');

@Component({
  selector: 'app-settings-page',
  imports: [FormsModule, MatCard, MatCardContent, MatButton, MatFormField, MatLabel, MatHint, MatSuffix, MatInput, MatDatepicker, MatDatepickerInput, MatDatepickerToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Settings &amp; donation</h1>

    @if (s(); as st) {
      <mat-card appearance="outlined">
        <mat-card-content>
          <h2>Cutoffs and dates</h2>
          <div class="grid">
            <mat-form-field appearance="outline"><mat-label>Shipping cutoff</mat-label><input matInput [matDatepicker]="p1" [value]="d(st.cutoffShip)" (dateChange)="set('cutoffShip', ymd($event.value))"><mat-datepicker-toggle matIconSuffix [for]="p1" /><mat-datepicker #p1 /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Local delivery / pickup cutoff</mat-label><input matInput [matDatepicker]="p2" [value]="d(st.cutoffLocal)" (dateChange)="set('cutoffLocal', ymd($event.value))"><mat-datepicker-toggle matIconSuffix [for]="p2" /><mat-datepicker #p2 /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Ordering closes</mat-label><input matInput [matDatepicker]="p3" [value]="d(st.orderingCloses)" (dateChange)="set('orderingCloses', ymd($event.value))"><mat-datepicker-toggle matIconSuffix [for]="p3" /><mat-datepicker #p3 /></mat-form-field>
          </div>

          <h2>Shipping and rules</h2>
          <div class="grid">
            @for (t of st.shipTiers; track $index) {
              <mat-form-field appearance="outline"><mat-label>Up to {{ t.maxLb }} lb ($)</mat-label><input matInput inputmode="decimal" [ngModel]="(t.cents / 100).toFixed(2)" (ngModelChange)="tier($index, $event)" [name]="'tier' + $index"></mat-form-field>
            }
            <mat-form-field appearance="outline"><mat-label>Delivery 25 mi–1 hr ($)</mat-label><input matInput inputmode="decimal" [ngModel]="(st.farDeliveryCents / 100).toFixed(2)" (ngModelChange)="set('farDeliveryCents', dollarsToCents($event) ?? 0)" name="far"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Packaging weight (lb)</mat-label><input matInput type="number" step="0.1" [ngModel]="st.packagingLb" (ngModelChange)="set('packagingLb', +$event)" name="pk"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Minimum items</mat-label><input matInput type="number" [ngModel]="st.minItems" (ngModelChange)="set('minItems', +$event)" name="min"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Large order: more than N items</mat-label><input matInput type="number" [ngModel]="st.largeOrderItems" (ngModelChange)="set('largeOrderItems', +$event)" name="large"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Unpaid expiry (hours)</mat-label><input matInput type="number" [ngModel]="st.unpaidExpiryHours" (ngModelChange)="set('unpaidExpiryHours', +$event)" name="exp"></mat-form-field>
          </div>
          <p class="muted">Shipping tiers: edit the dollar amounts; weights (2, 4, 8 lb) are fixed. Over the top tier is quoted by you.</p>

          <h2>Charity, contact and payment</h2>
          <div class="grid">
            <mat-form-field appearance="outline" class="wide"><mat-label>Charity name (leave blank until written permission is on file)</mat-label><input matInput [ngModel]="st.charityName ?? ''" (ngModelChange)="set('charityName', $event.trim() || null)" name="charity"><mat-hint>Blank shows "a local Des Moines-area soup kitchen (named here when confirmed)"</mat-hint></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Your first name</mat-label><input matInput [ngModel]="st.ownerFirstName" (ngModelChange)="set('ownerFirstName', $event)" name="first"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Contact email</mat-label><input matInput [ngModel]="st.contactEmail" (ngModelChange)="set('contactEmail', $event)" name="cemail"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Contact phone (text-capable)</mat-label><input matInput [ngModel]="st.contactPhone" (ngModelChange)="set('contactPhone', $event)" name="cphone"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Zelle (phone/email)</mat-label><input matInput [ngModel]="st.payments.zelle" (ngModelChange)="pay('zelle', $event)" name="zelle"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Venmo handle</mat-label><input matInput [ngModel]="st.payments.venmo" (ngModelChange)="pay('venmo', $event)" name="venmo"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Cash App $cashtag</mat-label><input matInput [ngModel]="st.payments.cashapp" (ngModelChange)="pay('cashapp', $event)" name="cashapp"></mat-form-field>
            <mat-form-field appearance="outline" class="wide"><mat-label>"Learn more" link (your Amway site)</mat-label><input matInput [ngModel]="st.learnMoreUrl" (ngModelChange)="set('learnMoreUrl', $event)" name="learn"></mat-form-field>
            <mat-form-field appearance="outline" class="wide"><mat-label>Pickup note (never your home address)</mat-label><input matInput [ngModel]="st.pickupNote" (ngModelChange)="set('pickupNote', $event)" name="pickup"></mat-form-field>
          </div>

          <h2>Delivery ZIP lists</h2>
          <div class="grid">
            <mat-form-field appearance="outline" class="wide"><mat-label>Near (free delivery, about 25 mi)</mat-label><textarea matInput rows="3" [ngModel]="near()" (ngModelChange)="near.set($event)" name="near"></textarea><mat-hint>5-digit ZIPs separated by spaces or commas</mat-hint></mat-form-field>
            <mat-form-field appearance="outline" class="wide"><mat-label>Far (flat fee, up to 1 hour)</mat-label><textarea matInput rows="3" [ngModel]="far()" (ngModelChange)="far.set($event)" name="far2"></textarea></mat-form-field>
          </div>
          <button mat-flat-button type="button" (click)="save()" [disabled]="busy()">Save settings</button>
        </mat-card-content>
      </mat-card>
    }

    <mat-card appearance="outlined" class="gap">
      <mat-card-content>
        <h2>Donation calculator</h2>
        <p class="muted">Profit = price − your cost for units sold (shipping excluded, leftover boxes not deducted, refunds subtracted). Bonus share = promo BV ÷ total November BV × November performance bonus and awards, from your Business Center statement after month-end.</p>
        <ul>
          <li>Profit so far (paid, non-test orders): <b>{{ m(profit()) }}</b></li>
          <li>Promo BV (units sold × item BV): <b>{{ promoBvTotal().toFixed(2) }}</b> @if (missingBv()) { <span class="muted">({{ missingBv() }} sold item(s) have no BV yet)</span> }</li>
        </ul>
        <div class="grid">
          <mat-form-field appearance="outline"><mat-label>Total November BV</mat-label><input matInput inputmode="decimal" [ngModel]="novBv()" (ngModelChange)="novBv.set($event)" name="novbv"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>November bonus + awards ($)</mat-label><input matInput inputmode="decimal" [ngModel]="bonus()" (ngModelChange)="bonus.set($event)" name="bonus"></mat-form-field>
        </div>
        <p>Bonus share: <b>{{ m(share()) }}</b> · <b>Total donation: {{ m(donation()) }}</b></p>
        <button mat-stroked-button type="button" (click)="publish()">Publish totals on /totals</button>
        @if (s()?.totals?.published) { <span class="muted"> Published {{ s()!.totals.updatedAt?.slice(0, 10) }}: {{ m(s()!.totals.profitCents) }} + {{ m(s()!.totals.bonusCents) }}</span> }
      </mat-card-content>
    </mat-card>

    <mat-card appearance="outlined" class="gap">
      <mat-card-content>
        <h2>Purge personal data</h2>
        <p>Nulls name, email, phone and address on every order and keeps the anonymous rows (items, prices, totals) for the donation. Do this by Dec 31, after follow-up emails and the announcement. This cannot be undone.</p>
        <button mat-flat-button type="button" class="danger" (click)="purge()">Purge personal data…</button>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0 12px; }
    .wide { grid-column: 1 / -1; }
    .gap { margin-top: 16px; }
    .danger { --mat-button-filled-container-color: #a02a22; --mat-button-filled-label-text-color: #fff; }
  `,
})
export class SettingsPage {
  protected readonly data = inject(AdminData);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  protected readonly m = money;
  protected readonly dollarsToCents = dollarsToCents;
  protected readonly d = toDate;
  protected readonly ymd = toYmd;
  protected readonly s = signal<Settings | null>(null);
  protected readonly near = signal('');
  protected readonly far = signal('');
  protected readonly busy = signal(false);
  protected readonly novBv = signal('');
  protected readonly bonus = signal('');

  constructor() {
    effect(() => {
      const st = this.data.settings();
      if (st && !this.s()) this.s.set(structuredClone(st));
    });
    void this.data.api.adminZips().then((z) => { this.near.set(zipText(z, 'near')); this.far.set(zipText(z, 'far')); });
  }

  protected set<K extends keyof Settings>(k: K, v: Settings[K]): void { this.s.update((x) => (x ? { ...x, [k]: v } : x)); }
  protected pay(k: 'zelle' | 'venmo' | 'cashapp', v: string): void { this.s.update((x) => (x ? { ...x, payments: { ...x.payments, [k]: v } } : x)); }
  protected tier(i: number, v: string): void {
    this.s.update((x) => (x ? { ...x, shipTiers: x.shipTiers.map((t, j) => (j === i ? { ...t, cents: dollarsToCents(v) ?? t.cents } : t)) } : x));
  }

  protected readonly profit = computed(() => profitCents(this.data.orders()));
  private readonly bvById = computed(() => Object.fromEntries(this.data.items().filter((i) => i.bv != null).map((i) => [i.id, i.bv as number])));
  protected readonly promoBvTotal = computed(() => promoBv(this.data.orders(), this.bvById()));
  protected readonly missingBv = computed(() => {
    const ids = new Set(this.data.orders().filter((o) => !o.test && o.status !== 'placed' && o.status !== 'cancelled' && o.status !== 'expired').flatMap((o) => o.lines.map((l) => l.itemId)));
    return [...ids].filter((id) => this.bvById()[id] === undefined && this.data.items().find((i) => i.id === id)?.kind === 'amway').length;
  });
  protected readonly share = computed(() => bonusShareCents(this.promoBvTotal(), parseFloat(this.novBv()) || 0, dollarsToCents(this.bonus()) ?? 0));
  protected readonly donation = computed(() => donationCents(this.profit(), this.share()));

  private parseZips(text: string, zone: 'near' | 'far'): ZipRow[] {
    return [...new Set(text.split(/[\s,]+/).map((z) => normalizeZip(z)).filter((z): z is string => !!z))].map((zip) => ({ zip, zone }));
  }

  protected async save(): Promise<void> {
    const st = this.s();
    if (!st) return;
    this.busy.set(true);
    try {
      const near = this.parseZips(this.near(), 'near');
      const far = this.parseZips(this.far(), 'far').filter((f) => !near.some((n) => n.zip === f.zip));
      await this.data.api.adminSaveSettings(st);
      await this.data.api.adminSaveZips([...near, ...far]);
      this.snack.open('Settings saved', 'OK', { duration: 2500 });
    } catch (e) {
      this.snack.open(`Save failed: ${e instanceof Error ? e.message : e}`, 'OK', { duration: 6000 });
    } finally {
      this.busy.set(false);
    }
  }

  protected async publish(): Promise<void> {
    const st = this.s();
    if (!st) return;
    const next: Settings = { ...st, totals: { published: true, profitCents: this.profit(), bonusCents: this.share(), updatedAt: new Date().toISOString() } };
    try { await this.data.api.adminSaveSettings(next); this.s.set(next); this.snack.open('Totals published', 'OK', { duration: 2500 }); }
    catch (e) { this.snack.open(`Failed: ${e instanceof Error ? e.message : e}`, 'OK', { duration: 6000 }); }
  }

  protected purge(): void {
    this.dialog.open<NoticeDialog, unknown, boolean>(NoticeDialog, { data: { title: 'Purge personal data?', body: 'Every order loses its name, email, phone and address. Anonymous order rows stay. This cannot be undone.', confirmLabel: 'Purge now', cancelLabel: 'Cancel' } }).afterClosed().subscribe(async (ok) => {
      if (!ok) return;
      try { const n = await this.data.api.adminPurgePii(); await this.data.refresh(); this.snack.open(`${n} order(s) purged`, 'OK', { duration: 4000 }); }
      catch (e) { this.snack.open(`Failed: ${e instanceof Error ? e.message : e}`, 'OK', { duration: 6000 }); }
    });
  }
}
