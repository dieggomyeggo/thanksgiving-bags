// Item price = ceil to $0.25 of max( retail per unit, (cost + max(25% of cost, $0.50)) / 0.97 ).
// Integer cents throughout; the floor test is done in exact integer arithmetic.
import type { ItemRow } from './types.ts';

export const PRICE_STEP_CENTS = 25;

function checkCost(costCents: number): void {
  if (!Number.isInteger(costCents) || costCents < 0) throw new Error(`invalid cost: ${costCents}`);
}

/** Smallest price (cents) whose 97% net still covers cost + max(25% cost, $0.50). */
function floorCents(costCents: number): number {
  return Math.ceil((100 * costCents + Math.max(25 * costCents, 5000)) / 97);
}

export function unitPriceCents(costCents: number, retailCents: number | null | undefined): number {
  checkCost(costCents);
  const base = Math.max(retailCents ?? 0, floorCents(costCents));
  return Math.ceil(base / PRICE_STEP_CENTS) * PRICE_STEP_CENTS;
}

/** True when price*0.97 >= cost + max(25% cost, $0.50). */
export function floorOk(costCents: number, priceCents: number): boolean {
  return priceCents * 97 >= 100 * costCents + Math.max(25 * costCents, 5000);
}

export function assertPricingFloor(items: Pick<ItemRow, 'id' | 'costCents' | 'unitPriceCents'>[]): void {
  for (const i of items) {
    if (!floorOk(i.costCents, i.unitPriceCents)) {
      throw new Error(`pricing floor violated for item "${i.id}" (cost ${i.costCents}, price ${i.unitPriceCents})`);
    }
  }
}

/** Every bag clears the floor if every item does; this checks it explicitly on the bag's totals. */
export function assertBagFloor(
  lines: Record<string, number>,
  items: Pick<ItemRow, 'id' | 'costCents' | 'unitPriceCents'>[],
): void {
  const byId = new Map(items.map((i) => [i.id, i]));
  let price = 0;
  let needed = 0;
  for (const [id, qty] of Object.entries(lines)) {
    const it = byId.get(id);
    if (!it) throw new Error(`unknown item "${id}"`);
    price += it.unitPriceCents * qty;
    needed += qty * (100 * it.costCents + Math.max(25 * it.costCents, 5000));
  }
  if (price * 97 < needed) throw new Error('bag pricing floor violated');
}

/** Margin after the 3% payment-fee buffer, for the admin editor. */
export function marginCents(costCents: number, priceCents: number): number {
  return priceCents - costCents;
}
