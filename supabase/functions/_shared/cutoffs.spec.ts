import { describe, expect, it } from 'vitest';
import { batchDate, chicagoDate, isLate, lateNotice, orderingOpen } from './cutoffs.ts';
import { DEFAULT_SETTINGS as S } from './settings.ts';

const at = (iso: string) => new Date(iso);

describe('chicagoDate', () => {
  it('uses Central time, not UTC', () => {
    expect(chicagoDate(at('2026-11-16T03:30:00Z'))).toBe('2026-11-15'); // 9:30pm CST Nov 15
    expect(chicagoDate(at('2026-11-16T06:30:00Z'))).toBe('2026-11-16');
  });
});

describe('isLate', () => {
  it('shipping cutoff is end of Sun Nov 15', () => {
    expect(isLate('ship', at('2026-11-16T04:00:00Z'), S)).toBe(false); // 10pm Nov 15 CST
    expect(isLate('ship', at('2026-11-16T06:30:00Z'), S)).toBe(true);
  });
  it('local delivery and pickup share the Nov 19 cutoff', () => {
    expect(isLate('deliver', at('2026-11-19T20:00:00Z'), S)).toBe(false);
    expect(isLate('pickup', at('2026-11-20T07:00:00Z'), S)).toBe(true);
    expect(isLate('ship', at('2026-11-17T18:00:00Z'), S)).toBe(true);
  });
  it('early orders are on time', () => {
    expect(isLate('ship', at('2026-10-31T15:00:00Z'), S)).toBe(false);
  });
});

describe('orderingOpen', () => {
  it('open through Nov 30 inclusive', () => {
    expect(orderingOpen(at('2026-12-01T05:00:00Z'), S)).toBe(true); // 11pm Nov 30 CST
    expect(orderingOpen(at('2026-12-01T07:00:00Z'), S)).toBe(false);
  });
});

describe('lateNotice', () => {
  it('names the cutoff and says it will not arrive before Thanksgiving', () => {
    expect(lateNotice('ship', S)).toMatch(/Nov 15/);
    expect(lateNotice('ship', S)).toMatch(/will not arrive before Thanksgiving/);
    expect(lateNotice('deliver', S)).toMatch(/Nov 19/);
  });
});

describe('batchDate', () => {
  it('on-time shipping orders go in the Mon Nov 16 batch, local in the Fri Nov 20 batch', () => {
    expect(batchDate('ship', '2026-11-03', S)).toBe('2026-11-16');
    expect(batchDate('deliver', '2026-11-03', S)).toBe('2026-11-20');
    expect(batchDate('pickup', '2026-11-19', S)).toBe('2026-11-20');
  });
  it('late orders batch on the next Monday, capped at the Dec 1 final batch', () => {
    expect(batchDate('ship', '2026-11-17', S)).toBe('2026-11-23');
    expect(batchDate('deliver', '2026-11-20', S)).toBe('2026-11-23');
    expect(batchDate('ship', '2026-11-27', S)).toBe('2026-11-30');
    expect(batchDate('ship', '2026-11-30', S)).toBe('2026-12-01');
  });
});
