import type { Method, OrderStatus } from './types.ts';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: 'Placed',
  paid: 'Paid',
  ordered: 'Ordered from Amway',
  packed: 'Packed',
  delivered: 'Delivered',
  shipped: 'Shipped',
  picked_up: 'Picked up',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const PAID: OrderStatus[] = ['paid', 'ordered', 'packed', 'delivered', 'shipped', 'picked_up'];

export function isPaidStatus(s: OrderStatus): boolean {
  return PAID.includes(s);
}

/** Allowed next statuses. No cancellations once the Amway order is placed. */
export function nextStatuses(s: OrderStatus, method: Method): OrderStatus[] {
  switch (s) {
    case 'placed':
      return ['paid', 'cancelled', 'expired'];
    case 'paid':
      return ['ordered'];
    case 'ordered':
      return ['packed'];
    case 'packed':
      return [method === 'ship' ? 'shipped' : method === 'deliver' ? 'delivered' : 'picked_up'];
    default:
      return [];
  }
}

/** TG-1000 .. TG-9999 */
export function orderNumber(rng: () => number = Math.random): string {
  return `TG-${1000 + Math.floor(rng() * 9000)}`;
}
