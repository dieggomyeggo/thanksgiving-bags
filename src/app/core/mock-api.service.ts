import { Injectable, inject } from '@angular/core';
import { MemoryDb } from '@shared/memory-db';
import { handleNotify } from '@shared/notify';
import { handleExpireUnpaid, handlePurgePii } from '@shared/maintenance';
import { handlePlaceOrder } from '@shared/place-order';
import { SEED_ITEMS, SEED_STARTERS, SEED_ZIPS } from '@shared/seed-catalog';
import type { Mail } from '@shared/db';
import type { ItemRow, OrderRow, PublicItem, Settings, StarterBag, ZipRow } from '@shared/types';
import { ApiService, type Batch, type PlaceOrderRequest, type PlaceOrderResult } from './api.service';
import { ClockService } from './clock.service';

const toPublic = (i: ItemRow): PublicItem => ({
  id: i.id, shelf: i.shelf, name: i.name, kind: i.kind, unitPriceCents: i.unitPriceCents,
  weightLb: i.weightLb, tags: i.tagsVerified ? i.tags : {}, tagsVerified: i.tagsVerified, sort: i.sort,
});
const available = (i: ItemRow) => i.active && !i.soldOut && (i.stock === null || i.stock > 0);

/**
 * In-memory backend for local development and demos. It runs the very same place-order, notify and
 * maintenance cores the Edge Functions run, against a MemoryDb. Nothing leaves the browser; emails are only logged.
 */
@Injectable()
export class MockApiService extends ApiService {
  readonly isMock = true;
  private readonly clock = inject(ClockService);
  private readonly db = new MemoryDb({ items: SEED_ITEMS, zips: SEED_ZIPS, starters: SEED_STARTERS });
  private batches: Batch[] = [];
  private signedIn: string | null = null;
  readonly outbox: Mail[] = [];
  private readonly mailer = { send: async (m: Mail) => { this.outbox.push(m); console.info('[mock email]', m.to, m.subject); } };

  constructor() {
    super();
    this.db.clock = () => this.clock.now();
  }

  async getCatalog() { return this.db.items.filter(available).map(toPublic); }
  async getStarterBags() { return structuredClone(this.db.starters); }
  async getSettings() { return structuredClone(this.db.settings); }
  async getZips() { return structuredClone(this.db.zips); }

  async placeOrder(req: PlaceOrderRequest): Promise<PlaceOrderResult> {
    const r = await handlePlaceOrder(req, {
      db: this.db, mailer: this.mailer, now: () => this.clock.now(), rng: Math.random, clientHash: 'mock-client',
    });
    return r.body as unknown as PlaceOrderResult;
  }

  async sessionEmail() { return this.signedIn; }
  async isAdmin() { return this.signedIn !== null; }
  async signInWithEmail(email: string) { this.signedIn = email.trim().toLowerCase() || 'demo@example.com'; }
  async signOut() { this.signedIn = null; }

  async adminItems() { return structuredClone(this.db.items); }
  async adminSaveItems(items: ItemRow[]) {
    for (const it of items) {
      const i = this.db.items.findIndex((x) => x.id === it.id);
      if (i >= 0) this.db.items[i] = structuredClone(it);
      else this.db.items.push(structuredClone(it));
    }
  }
  async adminStarters() { return structuredClone(this.db.starters); }
  async adminSaveStarters(s: StarterBag[]) { this.db.starters = structuredClone(s); }
  async adminOrders() { return structuredClone(this.db.orders).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  async adminUpdateOrder(id: string, patch: Partial<OrderRow>) {
    const o = this.db.orders.find((x) => x.id === id);
    if (!o) return;
    Object.assign(o, patch);
    if (patch.status === 'paid' && !o.paidAt) o.paidAt = this.clock.now().toISOString();
  }
  async adminDeleteTestOrders() {
    const n = this.db.orders.filter((o) => o.test).length;
    this.db.orders = this.db.orders.filter((o) => !o.test);
    return n;
  }
  async adminNotify(orderId: string, event: 'placed' | 'paid' | 'ready', force = false) {
    const r = await handleNotify({ orderId, event, force }, { db: this.db, mailer: this.mailer, now: () => this.clock.now() });
    if (!r.body['ok']) throw new Error(String(r.body['error']));
  }
  async adminExpireUnpaid() { return (await handleExpireUnpaid({ db: this.db, now: () => this.clock.now() })).body['expired'] as number; }
  async adminPurgePii() { return (await handlePurgePii({ db: this.db, now: () => this.clock.now() })).body['purged'] as number; }
  async adminSettings() { return structuredClone(this.db.settings); }
  async adminSaveSettings(s: Settings) { this.db.settings = structuredClone(s); }
  async adminZips() { return structuredClone(this.db.zips); }
  async adminSaveZips(z: ZipRow[]) { this.db.zips = structuredClone(z); }
  async adminBatches() { return structuredClone(this.batches); }
  async adminCreateBatch(b: Omit<Batch, 'id'>) {
    const nb = { ...b, id: `batch-${this.batches.length + 1}` };
    this.batches.push(nb);
    return structuredClone(nb);
  }
}
