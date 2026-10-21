import { describe, expect, it } from 'vitest';
import { MemoryDb } from './memory-db.ts';
import { handleExpireUnpaid, handlePurgePii } from './maintenance.ts';
import { SEED_ITEMS } from './seed-catalog.ts';
import type { NewOrder } from './db.ts';

const order = (n: string, over: Partial<NewOrder> = {}): NewOrder => ({
  number: n, method: 'pickup', zone: null, name: 'Pat', email: 'pat@example.com', phone: '515', address: null, zip: '50131',
  payMethod: 'zelle', subtotalCents: 1000, shippingCents: 0, totalCents: 1000, shippingQuoteNeeded: false, late: false,
  needsApproval: false, optFollowup: true, optShoutout: false, notes: null, test: false, clientHash: 'h', lines: [], ...over,
});

describe('expire-unpaid', () => {
  it('cancels Placed non-cash orders older than 48 hours, keeps newer, cash and approval-pending orders', async () => {
    const db = new MemoryDb({ items: SEED_ITEMS, zips: [] });
    await db.insertOrder(order('TG-1001'));
    await db.insertOrder(order('TG-1002'));
    await db.insertOrder(order('TG-1003', { payMethod: 'cash' }));
    await db.insertOrder(order('TG-1004', { needsApproval: true }));
    const now = new Date('2026-11-05T12:00:00Z');
    db.orders[0].createdAt = '2026-11-03T11:00:00Z'; // 49h old
    db.orders[1].createdAt = '2026-11-03T13:00:00Z'; // 47h old
    db.orders[2].createdAt = '2026-11-01T00:00:00Z';
    db.orders[3].createdAt = '2026-11-01T00:00:00Z';
    const r = await handleExpireUnpaid({ db, now: () => now });
    expect(r.body).toMatchObject({ ok: true, expired: 1 });
    expect(db.orders.map((o) => o.status)).toEqual(['expired', 'placed', 'placed', 'placed']);
  });
  it('does not touch paid orders', async () => {
    const db = new MemoryDb({ items: SEED_ITEMS, zips: [] });
    await db.insertOrder(order('TG-1001'));
    db.orders[0].status = 'paid';
    db.orders[0].createdAt = '2026-10-01T00:00:00Z';
    await handleExpireUnpaid({ db, now: () => new Date('2026-11-05T12:00:00Z') });
    expect(db.orders[0].status).toBe('paid');
  });
});

describe('purge-pii', () => {
  it('nulls personal data but keeps anonymous order rows and totals', async () => {
    const db = new MemoryDb({ items: SEED_ITEMS, zips: [] });
    await db.insertOrder(order('TG-1001'));
    const r = await handlePurgePii({ db, now: () => new Date('2026-12-31T12:00:00Z') });
    expect(r.body).toMatchObject({ ok: true, purged: 1 });
    expect(db.orders[0]).toMatchObject({ name: null, email: null, phone: null, address: null, zip: null, clientHash: null, subtotalCents: 1000, number: 'TG-1001' });
    expect(db.orders[0].piiPurgedAt).toBe('2026-12-31T12:00:00.000Z');
    const again = await handlePurgePii({ db, now: () => new Date() });
    expect(again.body).toMatchObject({ purged: 0 });
  });
});
