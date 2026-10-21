import { describe, expect, it } from 'vitest';
import {
  assertBagFloor,
  assertPricingFloor,
  floorOk,
  unitPriceCents,
} from './pricing.ts';
import { SEED_ITEMS, SEED_STARTERS } from './seed-catalog.ts';

describe('unitPriceCents', () => {
  it('uses the cost buffer when it beats retail (XS Energy can: cost $2.47, retail $3.08)', () => {
    // (247 + max(61.75, 50)) / .97 = 318.3 -> 319 -> rounds up to $3.25
    expect(unitPriceCents(247, 308)).toBe(325);
  });
  it('uses the $0.50 minimum buffer for cheap items (honey stick, $0.20)', () => {
    // (20 + 50) / .97 = 72.2 -> 73 -> $0.75
    expect(unitPriceCents(20, null)).toBe(75);
  });
  it('uses retail when it is higher', () => {
    expect(unitPriceCents(100, 450)).toBe(450);
  });
  it('rounds up to the next $0.25 and never down', () => {
    expect(unitPriceCents(100, 400)).toBe(400);
    expect(unitPriceCents(100, 401)).toBe(425);
    expect(unitPriceCents(1280, 1600)).toBe(1650); // (128000+32000)/97 = 1649.5 -> 1650 beats retail 1600
  });
  it('is a multiple of 25 cents', () => {
    for (let c = 1; c < 5000; c += 37) expect(unitPriceCents(c, null) % 25).toBe(0);
  });
  it('rejects negative or non-integer cost', () => {
    expect(() => unitPriceCents(-1, null)).toThrow();
    expect(() => unitPriceCents(1.5, null)).toThrow();
  });
});

describe('floorOk', () => {
  it('holds exactly at the boundary', () => {
    // cost 200: buffer max(50, 50) = 50 -> need price*0.97 >= 250 -> price >= 257.7
    expect(floorOk(200, 258)).toBe(true);
    expect(floorOk(200, 257)).toBe(false);
  });
});

describe('pricing floor', () => {
  it('holds for every seed catalog item', () => {
    expect(() => assertPricingFloor(SEED_ITEMS)).not.toThrow();
    for (const i of SEED_ITEMS) expect(floorOk(i.costCents, i.unitPriceCents), i.id).toBe(true);
  });

  it('holds for every price generated across a wide cost range (deterministic sweep)', () => {
    for (let cost = 1; cost <= 20000; cost += 3) {
      for (const retail of [null, 0, cost, cost * 2]) {
        expect(floorOk(cost, unitPriceCents(cost, retail)), `${cost}/${retail}`).toBe(true);
      }
    }
  });

  it('holds for every starter bag and for 2000 random bags', () => {
    for (const b of SEED_STARTERS) expect(() => assertBagFloor(b.items, SEED_ITEMS)).not.toThrow();
    let seed = 42;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    for (let n = 0; n < 2000; n++) {
      const bag: Record<string, number> = {};
      const size = 3 + Math.floor(rnd() * 25);
      for (let k = 0; k < size; k++) {
        const it = SEED_ITEMS[Math.floor(rnd() * SEED_ITEMS.length)];
        bag[it.id] = (bag[it.id] ?? 0) + 1 + Math.floor(rnd() * 3);
      }
      expect(() => assertBagFloor(bag, SEED_ITEMS)).not.toThrow();
    }
  });

  it('assertPricingFloor throws naming the offending item', () => {
    const bad = { ...SEED_ITEMS[0], id: 'bad', unitPriceCents: SEED_ITEMS[0].costCents };
    expect(() => assertPricingFloor([bad])).toThrow(/bad/);
  });
});
