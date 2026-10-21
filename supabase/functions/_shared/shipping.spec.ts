import { describe, expect, it } from 'vitest';
import { quoteShipping } from './shipping.ts';
import { DEFAULT_SETTINGS as S } from './settings.ts';

describe('quoteShipping', () => {
  it('pickup is free', () => {
    expect(quoteShipping({ method: 'pickup', zone: null, weightLb: 3, settings: S })).toMatchObject({ kind: 'ok', cents: 0 });
  });
  it('local delivery: near free, far $5, out blocked, unknown needs zip', () => {
    expect(quoteShipping({ method: 'deliver', zone: 'near', weightLb: 3, settings: S })).toMatchObject({ kind: 'ok', cents: 0 });
    expect(quoteShipping({ method: 'deliver', zone: 'far', weightLb: 3, settings: S })).toMatchObject({ kind: 'ok', cents: 500 });
    expect(quoteShipping({ method: 'deliver', zone: 'out', weightLb: 3, settings: S }).kind).toBe('blocked');
    expect(quoteShipping({ method: 'deliver', zone: null, weightLb: 3, settings: S }).kind).toBe('needs_zip');
  });
  it('shipping tiers by weight, boundaries inclusive', () => {
    const q = (w: number) => quoteShipping({ method: 'ship', zone: null, weightLb: w, settings: S });
    expect(q(0.1).cents).toBe(1100);
    expect(q(2).cents).toBe(1100);
    expect(q(2.01).cents).toBe(1500);
    expect(q(4).cents).toBe(1500);
    expect(q(4.01).cents).toBe(2200);
    expect(q(8).cents).toBe(2200);
  });
  it('over 8 lb is quoted by the owner', () => {
    const r = quoteShipping({ method: 'ship', zone: null, weightLb: 8.01, settings: S });
    expect(r).toMatchObject({ kind: 'quote', cents: null });
    expect(r.label).toMatch(/quote/i);
  });
  it('respects edited tiers', () => {
    const r = quoteShipping({ method: 'ship', zone: null, weightLb: 1, settings: { ...S, shipTiers: [{ maxLb: 1, cents: 999 }] } });
    expect(r.cents).toBe(999);
  });
});
