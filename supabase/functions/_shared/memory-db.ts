import { DuplicateNumberError, type NewOrder, type ServerDb } from './db.ts';
import { mergeSettings } from './settings.ts';
import type { ItemRow, OrderRow, Settings, StarterBag, ZipRow } from './types.ts';

/** In-memory ServerDb. Backs the unit tests and the mock ApiService (storefront and admin demo without Supabase). */
export class MemoryDb implements ServerDb {
  items: ItemRow[];
  settings: Settings;
  zips: ZipRow[];
  starters: StarterBag[];
  orders: OrderRow[] = [];
  private seq = 0;
  /** Clock for created_at; tests and the mock API override it. */
  clock: () => Date = () => new Date();

  constructor(init: { items: ItemRow[]; zips: ZipRow[]; starters?: StarterBag[]; settings?: Partial<Settings> }) {
    this.items = structuredClone(init.items);
    this.zips = structuredClone(init.zips);
    this.starters = structuredClone(init.starters ?? []);
    this.settings = mergeSettings(init.settings);
  }

  async getItems() { return structuredClone(this.items); }
  async getSettings() { return structuredClone(this.settings); }
  async getZips() { return structuredClone(this.zips); }

  async countOrdersSince(f: { clientHash?: string; email?: string }, sinceIso: string) {
    return this.orders.filter(
      (o) => o.createdAt >= sinceIso && ((f.clientHash && o.clientHash === f.clientHash) || (f.email && o.email === f.email)),
    ).length;
  }

  async insertOrder(n: NewOrder) {
    if (this.orders.some((o) => o.number === n.number)) throw new DuplicateNumberError();
    const row: OrderRow = {
      ...structuredClone(n),
      id: `mem-${++this.seq}`,
      status: 'placed',
      tracking: null,
      readyWindow: null,
      cashConfirmed: false,
      adjustmentCents: 0,
      batchId: null,
      emailsSent: {},
      createdAt: this.clock().toISOString(),
      paidAt: null,
      piiPurgedAt: null,
    };
    this.orders.push(row);
    return { id: row.id };
  }

  async getOrder(id: string) { return structuredClone(this.orders.find((o) => o.id === id) ?? null); }

  async markEmailSent(orderId: string, kind: string, atIso: string) {
    const o = this.orders.find((x) => x.id === orderId);
    if (o) o.emailsSent[kind] = atIso;
  }

  async expireUnpaid(hours: number, now: Date) {
    const cutoff = new Date(now.getTime() - hours * 3600_000).toISOString();
    let n = 0;
    for (const o of this.orders) {
      if (o.status === 'placed' && o.payMethod !== 'cash' && !o.needsApproval && o.createdAt < cutoff) {
        o.status = 'expired';
        n++;
      }
    }
    return n;
  }

  async purgePii(now: Date) {
    let n = 0;
    for (const o of this.orders) {
      if (o.piiPurgedAt) continue;
      Object.assign(o, { name: null, email: null, phone: null, address: null, zip: null, clientHash: null, notes: null, tracking: null, readyWindow: null, piiPurgedAt: now.toISOString() });
      n++;
    }
    return n;
  }
}
