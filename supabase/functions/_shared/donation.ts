import type { OrderLine, OrderStatus } from './types.ts';
import { isPaidStatus } from './orders.ts';

export interface DonationOrder {
  status: OrderStatus;
  test: boolean;
  adjustmentCents: number; // negative for refunds
  shippingCents: number; // never part of profit
  lines: OrderLine[];
}

function counts(o: DonationOrder): boolean {
  return !o.test && isPaidStatus(o.status);
}

/** Profit = (price - unit cost) x units sold, shipping excluded, less refund adjustments. */
export function profitCents(orders: DonationOrder[]): number {
  let t = 0;
  for (const o of orders) {
    if (!counts(o)) continue;
    for (const l of o.lines) t += (l.unitPriceCents - l.unitCostCents) * l.qty;
    t += o.adjustmentCents;
  }
  return t;
}

export function promoBv(orders: Pick<DonationOrder, 'status' | 'test' | 'lines'>[], bvByItem: Record<string, number>): number {
  let t = 0;
  for (const o of orders) {
    if (o.test || !isPaidStatus(o.status)) continue;
    for (const l of o.lines) t += (bvByItem[l.itemId] ?? 0) * l.qty;
  }
  return t;
}

/** (promo BV / total November BV) x November performance bonus and awards, whole cents, never above the bonus. */
export function bonusShareCents(promoBvTotal: number, novemberBv: number, bonusCents: number): number {
  if (novemberBv <= 0 || promoBvTotal <= 0 || bonusCents <= 0) return 0;
  return Math.min(bonusCents, Math.round((promoBvTotal / novemberBv) * bonusCents));
}

export function donationCents(profit: number, bonusShare: number): number {
  return profit + bonusShare;
}
