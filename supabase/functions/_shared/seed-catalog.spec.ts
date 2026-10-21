import { describe, expect, it } from 'vitest';
import { SEED_ITEMS, SEED_STARTERS, SEED_ZIPS, SHELVES } from './seed-catalog.ts';

describe('placeholder seed', () => {
  it('has unique ids and every item on a known shelf', () => {
    expect(new Set(SEED_ITEMS.map((i) => i.id)).size).toBe(SEED_ITEMS.length);
    for (const i of SEED_ITEMS) expect(SHELVES as readonly string[]).toContain(i.shelf);
  });
  it('starter bags reference real items, have 3+ items and at least 2 Amway items', () => {
    for (const b of SEED_STARTERS) {
      const ids = Object.keys(b.items);
      expect(ids.every((id) => SEED_ITEMS.some((i) => i.id === id)), b.name).toBe(true);
      expect(Object.values(b.items).reduce((a, q) => a + q, 0)).toBeGreaterThanOrEqual(3);
      expect(ids.filter((id) => SEED_ITEMS.find((i) => i.id === id)!.kind === 'amway').length, b.name).toBeGreaterThanOrEqual(2);
    }
  });
  it('ZIP allowlist is valid and unique', () => {
    expect(new Set(SEED_ZIPS.map((z) => z.zip)).size).toBe(SEED_ZIPS.length);
    for (const z of SEED_ZIPS) expect(z.zip).toMatch(/^\d{5}$/);
  });
});
