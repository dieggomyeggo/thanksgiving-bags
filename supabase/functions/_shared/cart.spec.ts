import { describe, expect, it } from 'vitest';
import { bonusCountFor, countItems, freeCountFor, isLargeOrder, subtotalCents, validateCart, weightLb } from './cart.ts';
import { DEFAULT_SETTINGS } from './settings.ts';

const cat = [
  { id: 'a', unitPriceCents: 325, weightLb: 0.9, available: true },
  { id: 'b', unitPriceCents: 75, weightLb: 0.05, available: true },
  { id: 'gone', unitPriceCents: 100, weightLb: 0.1, available: false },
];

describe('cart', () => {
  it('counts items and ignores junk quantities', () => {
    expect(countItems({ a: 2, b: 1, c: 0 })).toBe(3);
  });
  it('computes subtotal and weight (with packaging)', () => {
    expect(subtotalCents({ a: 2, b: 2 }, cat)).toBe(2 * 325 + 2 * 75);
    expect(weightLb({ a: 2, b: 2 }, cat, 0.5)).toBeCloseTo(0.5 + 1.8 + 0.1);
  });
  it('blocks a 2-item bag (minimum 3)', () => {
    const r = validateCart({ a: 1, b: 1 }, cat, DEFAULT_SETTINGS);
    expect(r.map((e) => e.code)).toContain('too_few');
  });
  it('accepts exactly 3 items', () => {
    expect(validateCart({ a: 2, b: 1 }, cat, DEFAULT_SETTINGS)).toEqual([]);
  });
  it('flags unknown and unavailable items', () => {
    const r = validateCart({ a: 2, zzz: 1, gone: 1 }, cat, DEFAULT_SETTINGS);
    expect(r.filter((e) => e.itemId).map((e) => `${e.code}:${e.itemId}`).sort()).toEqual([
      'unavailable:gone',
      'unknown_item:zzz',
    ]);
  });
  it('rejects fractional, negative and absurd quantities', () => {
    expect(validateCart({ a: 1.5, b: 2 }, cat, DEFAULT_SETTINGS).some((e) => e.code === 'bad_qty')).toBe(true);
    expect(validateCart({ a: -1, b: 4 }, cat, DEFAULT_SETTINGS).some((e) => e.code === 'bad_qty')).toBe(true);
    expect(validateCart({ a: 1000, b: 4 }, cat, DEFAULT_SETTINGS).some((e) => e.code === 'bad_qty')).toBe(true);
  });
  it('large order is MORE than 20 items (21 yes, 20 no)', () => {
    expect(isLargeOrder(20, DEFAULT_SETTINGS)).toBe(false);
    expect(isLargeOrder(21, DEFAULT_SETTINGS)).toBe(true);
  });
});

describe('freeCountFor', () => {
  it('is zero below the minimum order, then scales with paid items up to the cap', () => {
    const f = (n: number) => freeCountFor(n, DEFAULT_SETTINGS);
    expect([0, 1, 2].map(f)).toEqual([0, 0, 0]);
    expect([3, 4, 5].map(f)).toEqual([2, 2, 2]);
    expect([6, 8, 9, 12, 15, 40].map(f)).toEqual([3, 3, 4, 5, 6, 6]);
  });
});

describe('bonusCountFor', () => {
  it('is one free paid item at $20, then one more per extra $10', () => {
    const f = (c: number) => bonusCountFor(c, DEFAULT_SETTINGS);
    expect([0, 1999].map(f)).toEqual([0, 0]);
    expect([2000, 2999, 3000, 4000, 5000].map(f)).toEqual([1, 1, 2, 3, 4]);
    expect(f(100000)).toBe(DEFAULT_SETTINGS.bonusMaxItems);
  });
});
