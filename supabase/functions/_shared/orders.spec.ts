import { describe, expect, it } from 'vitest';
import { isPaidStatus, nextStatuses, orderNumber } from './orders.ts';

describe('orders', () => {
  it('order numbers look like TG-1234 and use the supplied rng', () => {
    expect(orderNumber(() => 0)).toBe('TG-1000');
    expect(orderNumber(() => 0.9999)).toBe('TG-9999');
  });
  it('lifecycle: placed -> paid -> ordered -> packed -> delivered/shipped/picked_up by method', () => {
    expect(nextStatuses('placed', 'ship')).toEqual(['paid', 'cancelled', 'expired']);
    expect(nextStatuses('paid', 'ship')).toEqual(['ordered']);
    expect(nextStatuses('ordered', 'ship')).toEqual(['packed']);
    expect(nextStatuses('packed', 'ship')).toEqual(['shipped']);
    expect(nextStatuses('packed', 'deliver')).toEqual(['delivered']);
    expect(nextStatuses('packed', 'pickup')).toEqual(['picked_up']);
  });
  it('no cancellations after the Amway order is placed', () => {
    expect(nextStatuses('ordered', 'ship')).not.toContain('cancelled');
    expect(nextStatuses('delivered', 'deliver')).toEqual([]);
  });
  it('paid-ish statuses', () => {
    expect(isPaidStatus('paid')).toBe(true);
    expect(isPaidStatus('delivered')).toBe(true);
    expect(isPaidStatus('placed')).toBe(false);
    expect(isPaidStatus('expired')).toBe(false);
  });
});
