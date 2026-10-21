import { TestBed } from '@angular/core/testing';
import { ApiService } from '../core/api.service';
import { MockApiService } from '../core/mock-api.service';
import { BagStore } from './bag.store';

describe('BagStore (on the mock API)', () => {
  let store: BagStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useClass: MockApiService }] });
    store = TestBed.inject(BagStore);
    await store.load();
    store.method.set('pickup');
    store.freePicks.set(['hot-cocoa', 'apple-cider']);
  });

  it('loads shelves, starters and public items without any cost fields', () => {
    expect(store.shelves().length).toBeGreaterThan(3);
    expect(store.starters().length).toBe(4);
    expect(JSON.stringify(store.catalog())).not.toMatch(/cost|retail|"bv"|"pv"/i);
  });

  it('requires the 3-item minimum', () => {
    store.setQty('honey-stick', 2);
    expect(store.problems().join(' ')).toContain('Add at least 3 items');
    store.setQty('hand-warmer', 1);
    expect(store.problems().join(' ')).not.toContain('Add at least 3 items');
  });

  it('applies a starter bag and computes the total from catalog prices', () => {
    store.applyStarter(store.starters()[0]);
    expect(store.count()).toBe(5);
    const expected = store.bagLines().reduce((a, l) => a + l.qty * l.item.unitPriceCents, 0);
    expect(store.subtotal()).toBe(expected);
    expect(store.total()).toBe(expected); // pickup is free
  });

  it('reports starter items that are no longer available', () => {
    const missing = store.applyStarter({ id: 'x', name: 'X', blurb: '', sort: 1, items: { 'honey-stick': 3, nope: 1 } });
    expect(missing).toEqual(['nope']);
    expect(store.count()).toBe(3);
  });

  it('delivery needs a ZIP on the allowlist; far adds the flat fee; out is blocked', () => {
    store.setQty('honey-stick', 3);
    store.method.set('deliver');
    store.zip.set('50131');
    expect(store.quote().cents).toBe(0);
    store.zip.set('50010');
    expect(store.quote().cents).toBe(500);
    store.zip.set('90210');
    expect(store.quote().kind).toBe('blocked');
    expect(store.problems().join(' ')).toContain('outside the delivery area');
  });

  it('opt-in boxes are unchecked by default', () => {
    expect(store.optFollowup()).toBe(false);
    expect(store.optShoutout()).toBe(false);
  });

  it('places an order end to end and clears the bag', async () => {
    store.setQty('honey-stick', 3);
    store.name.set('Pat');
    store.email.set('pat@example.com');
    const r = await store.place();
    expect(r.ok).toBe(true);
    expect(store.confirmation()?.number).toMatch(/^TG-\d{4}$/);
    expect(store.count()).toBe(0);
  });

  it('a filled honeypot is rejected', async () => {
    store.setQty('honey-stick', 3);
    store.name.set('Bot');
    store.email.set('bot@example.com');
    store.website.set('http://spam.example');
    const r = await store.place();
    expect(r.ok).toBe(false);
    expect(store.confirmation()).toBeNull();
  });

  it('needs both free extras chosen and only offers non-Amway items', () => {
    store.setQty('honey-stick', 3);
    store.name.set('Pat');
    store.email.set('pat@example.com');
    expect(store.freeOptions().every((i) => i.kind === 'other')).toBe(true);
    expect(store.problems()).toEqual([]);
    store.freePicks.set(['hot-cocoa', '']);
    expect(store.problems().join(' ')).toContain('Choose your 2 free extras');
  });

  it('free extras add no cost but are sent and shown on the confirmation', async () => {
    store.setQty('honey-stick', 3);
    store.name.set('Pat');
    store.email.set('pat@example.com');
    const before = store.total();
    expect(store.freeLines().length).toBe(2);
    const r = await store.place();
    expect(r.ok && r.totalCents).toBe(before);
    expect(store.confirmation()?.lines.filter((l) => l.free).length).toBe(2);
  });
});
