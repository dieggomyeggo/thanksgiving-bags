import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryDb } from './memory-db.ts';
import { handlePlaceOrder, type PlaceOrderDeps } from './place-order.ts';
import { SEED_ITEMS, SEED_STARTERS } from './seed-catalog.ts';
import type { Mail } from './db.ts';

const ZIPS = [
  { zip: '50131', zone: 'near' as const },
  { zip: '50010', zone: 'far' as const },
];
const NOW = new Date('2026-11-02T15:00:00Z'); // Mon Nov 2, before every cutoff

let db: MemoryDb;
let sent: Mail[];
let deps: PlaceOrderDeps;

const P = (id: string) => SEED_ITEMS.find((i) => i.id === id)!.unitPriceCents;
const FREE = { 'hot-cocoa': 1, 'apple-cider': 1 };
const bag = { 'xs-energy-can': 2, 'honey-stick': 1 }; // 3 items
const base = (over: Record<string, unknown> = {}) => ({
  items: bag, freeItems: FREE, method: 'pickup', payMethod: 'zelle', name: 'Pat Doe', email: 'pat@example.com',
  expectedTotalCents: 2 * P('xs-energy-can') + P('honey-stick'), website: '', ...over,
});

beforeEach(() => {
  db = new MemoryDb({ items: SEED_ITEMS, zips: ZIPS, starters: SEED_STARTERS });
  db.clock = () => NOW;
  sent = [];
  let n = 0;
  deps = {
    db,
    mailer: { async send(m) { sent.push(m); } },
    now: () => NOW,
    rng: () => (n++ % 9000) / 9000,
    clientHash: 'hash-1',
  };
});

describe('handlePlaceOrder', () => {
  it('places a pickup order, recomputes totals from the DB, snapshots cost, sends email 1', async () => {
    const r = await handlePlaceOrder(base(), deps);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, totalCents: 2 * P('xs-energy-can') + P('honey-stick'), shippingCents: 0, late: false, needsApproval: false });
    expect(db.orders).toHaveLength(1);
    expect(db.orders[0].lines.find((l) => l.itemId === 'xs-energy-can')).toMatchObject({ qty: 2, unitCostCents: 247, unitPriceCents: P('xs-energy-can') });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('pat@example.com');
    expect(sent[0].text).toContain(db.orders[0].number);
    expect(db.orders[0].emailsSent['placed']).toBeTruthy();
  });

  it('never leaks item cost in the response', async () => {
    const r = await handlePlaceOrder(base(), deps);
    expect(JSON.stringify(r.body)).not.toMatch(/cost/i);
  });

  it('rejects a tampered client total and reports the server total', async () => {
    const r = await handlePlaceOrder(base({ expectedTotalCents: 1 }), deps);
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ ok: false, error: 'price_changed', totalCents: 2 * P('xs-energy-can') + P('honey-stick') });
    expect(db.orders).toHaveLength(0);
  });

  it('rejects the honeypot', async () => {
    const r = await handlePlaceOrder(base({ website: 'http://spam.example' }), deps);
    expect(r.status).toBe(422);
    expect(db.orders).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it('blocks a 2-item bag (minimum 3)', async () => {
    const r = await handlePlaceOrder(base({ items: { 'xs-energy-can': 1, 'honey-stick': 1 }, expectedTotalCents: null }), deps);
    expect(r.status).toBe(422);
    expect(JSON.stringify(r.body)).toContain('too_few');
  });

  it('rejects unknown, sold-out and inactive items', async () => {
    db.items.find((i) => i.id === 'honey-stick')!.soldOut = true;
    db.items.find((i) => i.id === 'hand-warmer')!.active = false;
    const r = await handlePlaceOrder(base({ items: { 'xs-energy-can': 2, 'honey-stick': 1, 'hand-warmer': 1, nope: 1 }, expectedTotalCents: null }), deps);
    expect(r.status).toBe(422);
    const s = JSON.stringify(r.body);
    expect(s).toContain('unavailable');
    expect(s).toContain('unknown_item');
  });

  it('rejects items whose stock is exhausted', async () => {
    db.items.find((i) => i.id === 'honey-stick')!.stock = 0;
    const r = await handlePlaceOrder(base({ expectedTotalCents: null }), deps);
    expect(r.status).toBe(422);
  });

  it('local delivery: near free, far flat fee, out blocked', async () => {
    const sub = 2 * P('xs-energy-can') + P('honey-stick');
    const near = await handlePlaceOrder(base({ method: 'deliver', zip: '50131', address: '1 Main St', expectedTotalCents: sub }), deps);
    expect(near.body).toMatchObject({ ok: true, shippingCents: 0 });
    const far = await handlePlaceOrder(base({ method: 'deliver', zip: '50010', address: '1 Main St', expectedTotalCents: sub + 500 }), deps);
    expect(far.body).toMatchObject({ ok: true, shippingCents: 500 });
    const out = await handlePlaceOrder(base({ method: 'deliver', zip: '90210', address: '1 Main St', expectedTotalCents: sub }), deps);
    expect(out.status).toBe(422);
    expect(JSON.stringify(out.body)).toContain('out_of_area');
  });

  it('shipping: weight tier from DB weights; over 8 lb needs a quote and approval', async () => {
    const heavy = { 'dish-drops': 3, 'loc-cleaner': 1 }; // 4 x 2.3 lb + 0.5 = 9.7 lb
    const r = await handlePlaceOrder(base({ method: 'ship', zip: '60601', address: '1 Main St', items: heavy, expectedTotalCents: 3 * P('dish-drops') + P('loc-cleaner') }), deps);
    expect(r.body).toMatchObject({ ok: true, shippingCents: 0, shippingQuoteNeeded: true, needsApproval: true });
    const small = await handlePlaceOrder(base({ method: 'ship', zip: '60601', address: '1 Main St', expectedTotalCents: 2 * P('xs-energy-can') + P('honey-stick') + 1500 }), deps); // 2.35 lb incl. packaging -> 4 lb tier
    expect(small.body).toMatchObject({ ok: true, shippingCents: 1500 });
  });

  it('flags a late order after each cutoff', async () => {
    const sub = 2 * P('xs-energy-can') + P('honey-stick');
    deps.now = () => new Date('2026-11-10T18:00:00Z'); // after Nov 8, before Nov 12
    const ship = await handlePlaceOrder(base({ method: 'ship', zip: '60601', address: 'x', expectedTotalCents: sub + 1500 }), deps);
    expect(ship.body).toMatchObject({ late: true });
    const local = await handlePlaceOrder(base({ expectedTotalCents: sub }), deps);
    expect(local.body).toMatchObject({ late: false });
    deps.now = () => new Date('2026-11-14T18:00:00Z');
    const local2 = await handlePlaceOrder(base({ expectedTotalCents: sub }), deps);
    expect(local2.body).toMatchObject({ late: true });
    expect(sent.at(-1)!.text).toMatch(/will not arrive before Thanksgiving/);
  });

  it('large orders (more than 20 items) need approval and the email withholds payment steps', async () => {
    const items = { 'honey-stick': 21 };
    const r = await handlePlaceOrder(base({ items, expectedTotalCents: 21 * P('honey-stick') }), deps);
    expect(r.body).toMatchObject({ ok: true, needsApproval: true });
    expect(sent[0].text).toMatch(/do not send payment yet/i);
    const exactly20 = await handlePlaceOrder(base({ items: { 'honey-stick': 20 }, expectedTotalCents: 20 * P('honey-stick') }), deps);
    expect(exactly20.body).toMatchObject({ needsApproval: false });
  });

  it('requires phone for cash orders', async () => {
    const r = await handlePlaceOrder(base({ payMethod: 'cash' }), deps);
    expect(r.status).toBe(422);
    const ok = await handlePlaceOrder(base({ payMethod: 'cash', phone: '515-555-0100' }), deps);
    expect(ok.status).toBe(200);
  });

  it('opt-in boxes default to false and are stored when ticked', async () => {
    await handlePlaceOrder(base(), deps);
    expect(db.orders[0]).toMatchObject({ optFollowup: false, optShoutout: false });
    await handlePlaceOrder(base({ optFollowup: true, optShoutout: true }), deps);
    expect(db.orders[1]).toMatchObject({ optFollowup: true, optShoutout: true });
  });

  it('flags TEST orders by name prefix', async () => {
    await handlePlaceOrder(base({ name: 'TEST Pat' }), deps);
    expect(db.orders[0].test).toBe(true);
  });

  it('rate-limits repeated orders from one client', async () => {
    for (let i = 0; i < 5; i++) expect((await handlePlaceOrder(base({ email: `a${i}@example.com` }), deps)).status).toBe(200);
    const r = await handlePlaceOrder(base({ email: 'a9@example.com' }), deps);
    expect(r.status).toBe(429);
  });

  it('still succeeds if the email provider fails, and records no email', async () => {
    deps.mailer = { async send() { throw new Error('resend down'); } };
    const r = await handlePlaceOrder(base(), deps);
    expect(r.status).toBe(200);
    expect(db.orders[0].emailsSent['placed']).toBeUndefined();
  });

  it('retries when the random order number collides', async () => {
    deps.rng = (() => { const seq = [0, 0, 0.5]; return () => seq.shift() ?? 0.7; })();
    await handlePlaceOrder(base(), deps);
    const r = await handlePlaceOrder(base({ email: 'b@example.com' }), deps);
    expect(r.status).toBe(200);
    expect(new Set(db.orders.map((o) => o.number)).size).toBe(2);
  });

  it('rejects malformed input without throwing', async () => {
    expect((await handlePlaceOrder(null, deps)).status).toBe(422);
    expect((await handlePlaceOrder({ items: 5 }, deps)).status).toBe(422);
  });

  describe('free extras', () => {
    it('stores two free non-Amway extras at $0 with the owner cost snapshotted; total unchanged', async () => {
      const r = await handlePlaceOrder(base(), deps);
      expect(r.body).toMatchObject({ ok: true, totalCents: 2 * P('xs-energy-can') + P('honey-stick') });
      const free = db.orders[0].lines.filter((l) => l.free);
      expect(free.map((l) => [l.itemId, l.unitPriceCents, l.unitCostCents])).toEqual([['hot-cocoa', 0, 45], ['apple-cider', 0, 45]]);
      expect(sent[0].text).toContain('FREE');
    });
    it('requires exactly two (units), not one or three', async () => {
      for (const f of [{}, { 'hot-cocoa': 1 }, { 'hot-cocoa': 3 }]) {
        const r = await handlePlaceOrder(base({ freeItems: f }), deps);
        expect(r.status).toBe(422);
        expect(JSON.stringify(r.body)).toContain('bad_free');
      }
    });
    it('allows two of the same extra', async () => {
      expect((await handlePlaceOrder(base({ freeItems: { 'hot-cocoa': 2 } }), deps)).status).toBe(200);
    });
    it('rejects Amway, unknown and sold-out items as extras', async () => {
      for (const f of [{ 'xs-energy-can': 1, 'hot-cocoa': 1 }, { nope: 1, 'hot-cocoa': 1 }]) {
        expect((await handlePlaceOrder(base({ freeItems: f }), deps)).status).toBe(422);
      }
      db.items.find((i) => i.id === 'apple-cider')!.soldOut = true;
      expect((await handlePlaceOrder(base(), deps)).status).toBe(422);
    });
    it('extras do not count toward the 3-item minimum or the large-order limit', async () => {
      const r = await handlePlaceOrder(base({ items: { 'xs-energy-can': 2 }, expectedTotalCents: null }), deps);
      expect(JSON.stringify(r.body)).toContain('too_few');
      const twenty = await handlePlaceOrder(base({ items: { 'honey-stick': 20 }, expectedTotalCents: 20 * P('honey-stick') }), deps);
      expect(twenty.body).toMatchObject({ needsApproval: false });
    });
    it('extras count toward shipping weight', async () => {
      // 8 lb boundary: 3 dish drops 6.9 + packaging 0.5 = 7.4; +2 hand-warmer-weight extras (0.1 each) stays under, so push over with 1 more drop
      const items = { 'dish-drops': 3, 'honey-stick': 3 }; // 6.9 + .15 + .5 = 7.55
      const ok = await handlePlaceOrder(base({ method: 'ship', zip: '60601', address: 'x', items, freeItems: FREE, expectedTotalCents: 3 * P('dish-drops') + 3 * P('honey-stick') + 2200 }), deps);
      expect(ok.body).toMatchObject({ shippingCents: 2200, shippingQuoteNeeded: false });
      const over = await handlePlaceOrder(base({ method: 'ship', zip: '60601', address: 'x', items: { 'dish-drops': 3, 'honey-stick': 3, 'xs-energy-can': 1 }, freeItems: FREE, expectedTotalCents: null }), deps);
      expect(over.body).toMatchObject({ shippingQuoteNeeded: true });
    });
  });
});
