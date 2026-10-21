import { describe, expect, it } from 'vitest';
import { bonusShareCents, donationCents, profitCents, promoBv, type DonationOrder } from './donation.ts';

const o = (p: Partial<DonationOrder>): DonationOrder => ({
  status: 'paid', test: false, adjustmentCents: 0, shippingCents: 1100,
  lines: [], ...p,
});

describe('donation', () => {
  it('profit = (price - cost) x units, shipping excluded', () => {
    const orders = [o({ lines: [{ itemId: 'a', qty: 2, unitPriceCents: 325, unitCostCents: 247 }, { itemId: 'b', qty: 1, unitPriceCents: 75, unitCostCents: 20 }] })];
    expect(profitCents(orders)).toBe(2 * 78 + 55);
  });
  it('ignores unpaid, cancelled, expired and test orders', () => {
    const line = { itemId: 'a', qty: 1, unitPriceCents: 100, unitCostCents: 50 };
    expect(profitCents([o({ status: 'placed', lines: [line] }), o({ status: 'expired', lines: [line] }), o({ status: 'cancelled', lines: [line] }), o({ test: true, lines: [line] })])).toBe(0);
  });
  it('counts delivered/shipped/picked-up orders', () => {
    const line = { itemId: 'a', qty: 1, unitPriceCents: 100, unitCostCents: 50 };
    expect(profitCents([o({ status: 'delivered', lines: [line] }), o({ status: 'shipped', lines: [line] })])).toBe(100);
  });
  it('subtracts refund adjustments', () => {
    const line = { itemId: 'a', qty: 1, unitPriceCents: 100, unitCostCents: 50 };
    expect(profitCents([o({ lines: [line], adjustmentCents: -75 })])).toBe(-25);
  });
  it('leftover units are not deducted (only units sold)', () => {
    const line = { itemId: 'a', qty: 1, unitPriceCents: 325, unitCostCents: 247 };
    expect(profitCents([o({ lines: [line] })])).toBe(78);
  });
  it('promo BV sums bv x qty over qualifying orders', () => {
    const orders = [o({ lines: [{ itemId: 'a', qty: 3, unitPriceCents: 1, unitCostCents: 1 }] }), o({ lines: [{ itemId: 'b', qty: 2, unitPriceCents: 1, unitCostCents: 1 }] })];
    expect(promoBv(orders, { a: 1.5, b: 2 })).toBeCloseTo(8.5);
    expect(promoBv(orders, {})).toBe(0);
  });
  it('bonus share = promo BV / total November BV x bonus, in whole cents', () => {
    expect(bonusShareCents(100, 1000, 25000)).toBe(2500);
    expect(bonusShareCents(1, 3, 100)).toBe(33);
    expect(bonusShareCents(0, 1000, 25000)).toBe(0);
    expect(bonusShareCents(10, 0, 25000)).toBe(0);
    expect(bonusShareCents(2000, 1000, 25000)).toBe(25000); // capped at the whole bonus
  });
  it('donation = profit + bonus share', () => {
    expect(donationCents(5000, 2500)).toBe(7500);
  });
  it('free extras reduce profit by their cost', () => {
    const lines = [{ itemId: 'a', qty: 1, unitPriceCents: 325, unitCostCents: 247 }, { itemId: 'cocoa', qty: 2, unitPriceCents: 0, unitCostCents: 45, free: true }];
    expect(profitCents([o({ lines })])).toBe(78 - 90);
  });
});
