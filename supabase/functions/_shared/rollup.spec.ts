import { describe, expect, it } from 'vitest';
import { buildRollup, type RollupOrder } from './rollup.ts';

const items = [
  { id: 'can', name: 'XS Energy 12 oz can', kind: 'amway' as const, boxSize: 12, costCents: 250 },
  { id: 'tea', name: 'Ginger Mint tea bag', kind: 'amway' as const, boxSize: 20, costCents: 68 },
  { id: 'cocoa', name: 'Hot cocoa packet', kind: 'other' as const, boxSize: 1, costCents: 45 },
];
const o = (p: Partial<RollupOrder>): RollupOrder => ({
  status: 'paid', payMethod: 'zelle', cashConfirmed: false, test: false,
  lines: [], ...p,
});

describe('buildRollup', () => {
  it('sums per item over paid orders and rounds Amway items up to whole boxes', () => {
    const r = buildRollup(
      [o({ lines: [{ itemId: 'can', qty: 5 }] }), o({ lines: [{ itemId: 'can', qty: 8 }, { itemId: 'tea', qty: 1 }] })],
      items,
    );
    const can = r.rows.find((x) => x.itemId === 'can')!;
    expect(can).toMatchObject({ units: 13, boxes: 2, leftover: 11, estCostCents: 24 * 250 });
    const tea = r.rows.find((x) => x.itemId === 'tea')!;
    expect(tea).toMatchObject({ units: 1, boxes: 1, leftover: 19 });
  });
  it('exactly one box when units equal box size', () => {
    const r = buildRollup([o({ lines: [{ itemId: 'can', qty: 12 }] })], items);
    expect(r.rows[0]).toMatchObject({ boxes: 1, leftover: 0 });
  });
  it('excludes unpaid, expired, cancelled, test and already-ordered orders', () => {
    const r = buildRollup(
      [
        o({ status: 'placed', lines: [{ itemId: 'can', qty: 1 }] }),
        o({ status: 'expired', lines: [{ itemId: 'can', qty: 1 }] }),
        o({ status: 'cancelled', lines: [{ itemId: 'can', qty: 1 }] }),
        o({ test: true, lines: [{ itemId: 'can', qty: 1 }] }),
        o({ status: 'ordered', lines: [{ itemId: 'can', qty: 1 }] }),
      ],
      items,
    );
    expect(r.rows).toEqual([]);
  });
  it('includes owner-confirmed cash orders that are still Placed', () => {
    const r = buildRollup(
      [
        o({ status: 'placed', payMethod: 'cash', cashConfirmed: true, lines: [{ itemId: 'can', qty: 3 }] }),
        o({ status: 'placed', payMethod: 'cash', cashConfirmed: false, lines: [{ itemId: 'can', qty: 9 }] }),
      ],
      items,
    );
    expect(r.rows[0].units).toBe(3);
  });
  it('non-Amway items are listed separately, not rounded to boxes', () => {
    const r = buildRollup([o({ lines: [{ itemId: 'cocoa', qty: 4 }] })], items);
    expect(r.rows[0]).toMatchObject({ kind: 'other', units: 4, boxes: 4, leftover: 0 });
    expect(r.amwayCostCents).toBe(0);
  });
  it('totals the estimated Amway cost and renders a copyable list', () => {
    const r = buildRollup([o({ lines: [{ itemId: 'can', qty: 13 }, { itemId: 'tea', qty: 1 }] })], items);
    expect(r.amwayCostCents).toBe(24 * 250 + 20 * 68);
    expect(r.text).toContain('2 box(es) x 12  XS Energy 12 oz can');
    expect(r.text).toContain('1 box(es) x 20  Ginger Mint tea bag');
  });
  it('free extras are included in the buy-elsewhere list', () => {
    const r = buildRollup([o({ lines: [{ itemId: 'cocoa', qty: 2 }] }), o({ lines: [{ itemId: 'cocoa', qty: 2 }] })], items);
    expect(r.rows[0]).toMatchObject({ itemId: 'cocoa', units: 4 });
  });
});
