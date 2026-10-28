import { Injectable, computed, inject, signal } from '@angular/core';
import { countItems, isLargeOrder, subtotalCents, validateCart, weightLb, type CartItem } from '@shared/cart';
import { isLate, lateNotice } from '@shared/cutoffs';
import { DEFAULT_SETTINGS } from '@shared/settings';
import { quoteShipping } from '@shared/shipping';
import type { Method, PayMethod, PublicItem, Settings, StarterBag, ZipRow } from '@shared/types';
import { normalizeZip, zoneFor } from '@shared/zip';
import { ApiService, type PlaceOrderResult } from '../core/api.service';
import { ClockService } from '../core/clock.service';

export interface Confirmation {
  number: string;
  name: string;
  payMethod: PayMethod;
  method: Method;
  lines: { name: string; qty: number; totalCents: number; free?: boolean }[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  late: boolean;
  needsApproval: boolean;
  shippingQuoteNeeded: boolean;
}

/** Shop state. Prices/shipping shown here use the shared modules; the server recomputes all of it on place-order. */
@Injectable({ providedIn: 'root' })
export class BagStore {
  private readonly api = inject(ApiService);
  private readonly clock = inject(ClockService);

  readonly catalog = signal<PublicItem[]>([]);
  readonly starters = signal<StarterBag[]>([]);
  readonly settings = signal<Settings>(DEFAULT_SETTINGS);
  readonly zips = signal<ZipRow[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly lines = signal<Record<string, number>>({});
  /** Customer's free non-Amway extras: one slot per free item ('' = not chosen yet). */
  readonly freePicks = signal<string[]>(['', '']);
  readonly method = signal<Method>('deliver');
  readonly zip = signal('');
  readonly address = signal('');
  readonly name = signal('');
  readonly email = signal('');
  readonly phone = signal('');
  readonly payMethod = signal<PayMethod>('zelle');
  readonly optFollowup = signal(false); // unchecked by default
  readonly optShoutout = signal(false); // unchecked by default
  readonly website = signal(''); // honeypot
  readonly placing = signal(false);
  readonly placeError = signal<string | null>(null);
  readonly confirmation = signal<Confirmation | null>(null);

  readonly cartItems = computed<CartItem[]>(() => this.catalog().map((i) => ({ id: i.id, unitPriceCents: i.unitPriceCents, weightLb: i.weightLb, available: true })));
  readonly shelves = computed(() => {
    const order: string[] = [];
    // The free-gift shelf is picked in the bag panel, not browsed or bought.
    for (const i of [...this.catalog()].sort((a, b) => a.sort - b.sort)) if (i.shelf !== this.settings().freeShelf && !order.includes(i.shelf)) order.push(i.shelf);
    return order;
  });
  readonly freeOptions = computed(() => this.catalog().filter((i) => i.kind === 'other' && i.shelf === this.settings().freeShelf).sort((a, b) => a.sort - b.sort));
  readonly freeSlots = computed(() => Array.from({ length: this.settings().freeItemCount }, (_, i) => this.freePicks()[i] ?? ''));
  readonly freeItems = computed(() => {
    const out: Record<string, number> = {};
    for (const id of this.freeSlots()) if (id) out[id] = (out[id] ?? 0) + 1;
    return out;
  });
  readonly freeLines = computed(() =>
    Object.entries(this.freeItems()).flatMap(([id, qty]) => {
      const item = this.catalog().find((i) => i.id === id);
      return item ? [{ item, qty }] : [];
    }),
  );
  readonly count = computed(() => countItems(this.lines()));
  readonly subtotal = computed(() => subtotalCents(this.lines(), this.cartItems()));
  private readonly mergedLines = computed(() => {
    const out = { ...this.lines() };
    for (const [k, v] of Object.entries(this.freeItems())) out[k] = (out[k] ?? 0) + v;
    return out;
  });
  readonly weight = computed(() => weightLb(this.mergedLines(), this.cartItems(), this.settings().packagingLb));
  readonly zone = computed(() => (this.method() === 'deliver' ? zoneFor(this.zip(), this.zips()) : null));
  readonly quote = computed(() => quoteShipping({ method: this.method(), zone: this.zone(), weightLb: this.weight(), settings: this.settings() }));
  readonly shipping = computed(() => this.quote().cents ?? 0);
  readonly total = computed(() => this.subtotal() + this.shipping());
  readonly large = computed(() => isLargeOrder(this.count(), this.settings()));
  readonly late = computed(() => isLate(this.method(), this.clock.now(), this.settings()));
  readonly lateText = computed(() => lateNotice(this.method(), this.settings()));
  readonly bagLines = computed(() =>
    Object.entries(this.lines())
      .map(([id, qty]) => ({ item: this.catalog().find((i) => i.id === id), qty }))
      .filter((l): l is { item: PublicItem; qty: number } => !!l.item),
  );

  /** Human-readable blockers shown next to Place order. */
  readonly problems = computed(() => {
    const p: string[] = [];
    const min = this.settings().minItems;
    if (this.count() < min) p.push(`Add at least ${min} items (${this.count()} so far).`);
    if (this.freeLines().reduce((a, l) => a + l.qty, 0) < this.settings().freeItemCount) p.push(`Choose your ${this.settings().freeItemCount} free extras.`);
    if (!this.name().trim()) p.push('Name needed.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(this.email().trim())) p.push('A valid email is needed.');
    if (this.method() !== 'pickup') {
      if (!this.address().trim()) p.push('Address needed.');
      if (!normalizeZip(this.zip())) p.push('A 5-digit ZIP is needed.');
    }
    if (this.quote().kind === 'blocked') p.push('That ZIP is outside the delivery area. Choose shipping or pickup.');
    if (this.payMethod() === 'cash' && !this.phone().trim()) p.push('Phone needed for cash orders so I can confirm by text.');
    return p;
  });

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [catalog, starters, settings, zips] = await Promise.all([
        this.api.getCatalog(), this.api.getStarterBags(), this.api.getSettings(), this.api.getZips(),
      ]);
      this.catalog.set(catalog);
      this.starters.set(starters);
      this.settings.set(settings);
      this.zips.set(zips);
      // Drop anything that disappeared (sold out) since the bag was built.
      this.lines.update((l) => Object.fromEntries(Object.entries(l).filter(([id]) => catalog.some((c) => c.id === id && c.shelf !== settings.freeShelf))));
      this.freePicks.update((p) => p.map((id) => (catalog.some((c) => c.id === id && c.kind === 'other' && c.shelf === this.settings().freeShelf) ? id : '')));
      this.loadError.set(null);
    } catch (e) {
      this.loadError.set(e instanceof Error ? e.message : 'Could not load the catalog.');
    } finally {
      this.loading.set(false);
    }
  }

  qty(id: string): number { return this.lines()[id] ?? 0; }

  setQty(id: string, qty: number): void {
    const q = Math.max(0, Math.min(99, Math.floor(qty)));
    this.lines.update((l) => {
      const next = { ...l };
      if (q === 0) delete next[id];
      else next[id] = q;
      return next;
    });
  }
  inc(id: string): void { this.setQty(id, this.qty(id) + 1); }
  dec(id: string): void { this.setQty(id, this.qty(id) - 1); }
  clear(): void { this.lines.set({}); }

  /** Loads a starter bag; returns the names of starter items that are no longer available. */
  applyStarter(s: StarterBag): string[] {
    const next: Record<string, number> = {};
    const missing: string[] = [];
    for (const [id, qty] of Object.entries(s.items)) {
      const it = this.catalog().find((c) => c.id === id);
      if (it?.shelf === this.settings().freeShelf) continue; // gifts are chosen separately
      if (it) next[id] = qty;
      else missing.push(id);
    }
    this.lines.set(next);
    return missing;
  }

  async place(): Promise<PlaceOrderResult> {
    if (this.placing()) return { ok: false, error: 'busy' };
    this.placing.set(true);
    this.placeError.set(null);
    const snapshot = {
      lines: [
        ...this.bagLines().map((l) => ({ name: l.item.name, qty: l.qty, totalCents: l.qty * l.item.unitPriceCents })),
        ...this.freeLines().map((l) => ({ name: l.item.name, qty: l.qty, totalCents: 0, free: true })),
      ],
      name: this.name().trim(), payMethod: this.payMethod(), method: this.method(),
    };
    try {
      const r = await this.api.placeOrder({
        items: this.lines(), freeItems: this.freeItems(), method: this.method(), zip: this.method() === 'pickup' ? null : this.zip().trim() || null,
        address: this.method() === 'pickup' ? null : this.address().trim() || null, name: this.name().trim(),
        email: this.email().trim(), phone: this.phone().trim() || null, payMethod: this.payMethod(),
        optFollowup: this.optFollowup(), optShoutout: this.optShoutout(), notes: null, website: this.website(),
        expectedTotalCents: this.total(),
      });
      if (r.ok) {
        this.confirmation.set({ ...snapshot, number: r.number, subtotalCents: r.subtotalCents, shippingCents: r.shippingCents, totalCents: r.totalCents, late: r.late, needsApproval: r.needsApproval, shippingQuoteNeeded: r.shippingQuoteNeeded });
        this.clear();
        this.freePicks.set(['', '']);
      } else {
        this.placeError.set(this.describeError(r));
        if (r.error === 'price_changed') await this.load();
      }
      return r;
    } finally {
      this.placing.set(false);
    }
  }

  private describeError(r: Extract<PlaceOrderResult, { ok: false }>): string {
    switch (r.error) {
      case 'price_changed': return 'Prices or shipping changed while you were shopping. I refreshed your bag; please review the total and try again.';
      case 'rate_limited': return 'Too many orders from this device in the last hour. Please try again later or text me.';
      case 'rejected': return 'That order could not be accepted.';
      case 'invalid': {
        const codes = (r.details ?? []).map((d) => d.code);
        if (codes.includes('unavailable') || codes.includes('unknown_item') || codes.includes('insufficient_stock')) return 'Something in your bag just became unavailable. Please refresh and review your bag.';
        if (codes.includes('out_of_area')) return 'That address is outside the delivery area.';
        return 'Please check the form and try again.';
      }
      default: return 'Something went wrong placing the order. Nothing was charged; please try again or email me.';
    }
  }

  reset(): void {
    this.confirmation.set(null);
    this.placeError.set(null);
  }
}
