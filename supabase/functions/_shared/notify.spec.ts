import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryDb } from './memory-db.ts';
import { handleNotify } from './notify.ts';
import { handlePlaceOrder } from './place-order.ts';
import { SEED_ITEMS } from './seed-catalog.ts';
import type { Mail } from './db.ts';

let db: MemoryDb;
let sent: Mail[];
let id: string;
const mailer = () => ({ async send(m: Mail) { sent.push(m); } });

beforeEach(async () => {
  db = new MemoryDb({ items: SEED_ITEMS, zips: [] });
  sent = [];
  const p = SEED_ITEMS.find((i) => i.id === 'honey-stick')!.unitPriceCents;
  await handlePlaceOrder({ items: { 'honey-stick': 3 }, freeItems: { 'hand-warmer': 2 }, method: 'ship', zip: '50131', address: '1 Main', payMethod: 'zelle', name: 'Pat', email: 'pat@example.com', expectedTotalCents: 3 * p + 1100 },
    { db, mailer: { async send() {} }, now: () => new Date('2026-11-02T12:00:00Z'), rng: Math.random, clientHash: 'h' });
  id = db.orders[0].id;
});

describe('handleNotify', () => {
  it('sends the paid email once (idempotent)', async () => {
    const a = await handleNotify({ orderId: id, event: 'paid' }, { db, mailer: mailer(), now: () => new Date() });
    expect(a.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toMatch(/Payment received/);
    const b = await handleNotify({ orderId: id, event: 'paid' }, { db, mailer: mailer(), now: () => new Date() });
    expect(b.body).toMatchObject({ ok: true, skipped: true });
    expect(sent).toHaveLength(1);
  });
  it('ready email includes window and tracking for shipments', async () => {
    db.orders[0].tracking = '9400 1000 0000';
    db.orders[0].readyWindow = 'ships Nov 16-18';
    await handleNotify({ orderId: id, event: 'ready' }, { db, mailer: mailer(), now: () => new Date() });
    expect(sent[0].text).toContain('9400 1000 0000');
    expect(sent[0].text).toContain('ships Nov 16-18');
  });
  it('resend placed email after approval', async () => {
    const r = await handleNotify({ orderId: id, event: 'placed', force: true }, { db, mailer: mailer(), now: () => new Date() });
    expect(r.status).toBe(200);
    expect(sent[0].subject).toMatch(/Your Thanksgiving bag order/);
  });
  it('404 for unknown order, 400 for unknown event, 409 after PII purge', async () => {
    const d = { db, mailer: mailer(), now: () => new Date() };
    expect((await handleNotify({ orderId: 'nope', event: 'paid' }, d)).status).toBe(404);
    expect((await handleNotify({ orderId: id, event: 'x' }, d)).status).toBe(400);
    await db.purgePii(new Date());
    expect((await handleNotify({ orderId: id, event: 'paid' }, d)).status).toBe(409);
  });
});
