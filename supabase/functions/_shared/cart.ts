import type { Settings } from './types.ts';

export type CartLines = Record<string, number>;

export interface CartItem {
  id: string;
  unitPriceCents: number;
  weightLb: number;
  available: boolean;
  kind?: 'amway' | 'other';
  shelf?: string;
}

export interface CartError {
  code: 'too_few' | 'unknown_item' | 'unavailable' | 'bad_qty' | 'bad_free' | 'free_only' | 'bad_bonus';
  itemId?: string;
}

export const MAX_QTY_PER_ITEM = 99;

export function countItems(lines: CartLines): number {
  let n = 0;
  for (const q of Object.values(lines)) if (Number.isInteger(q) && q > 0) n += q;
  return n;
}

export function subtotalCents(lines: CartLines, catalog: Pick<CartItem, 'id' | 'unitPriceCents'>[]): number {
  const by = new Map(catalog.map((i) => [i.id, i]));
  let t = 0;
  for (const [id, q] of Object.entries(lines)) t += (by.get(id)?.unitPriceCents ?? 0) * q;
  return t;
}

export function weightLb(lines: CartLines, catalog: Pick<CartItem, 'id' | 'weightLb'>[], packagingLb: number): number {
  const by = new Map(catalog.map((i) => [i.id, i]));
  let w = packagingLb;
  for (const [id, q] of Object.entries(lines)) w += (by.get(id)?.weightLb ?? 0) * q;
  return w;
}

export function isLargeOrder(count: number, s: Pick<Settings, 'largeOrderItems'>): boolean {
  return count > s.largeOrderItems;
}

/** Free extras earned by a bag: none until the minimum order, then `freeItemCount`, plus one per `freeEveryItems` more paid items, capped. */
export function freeCountFor(paidCount: number, s: Pick<Settings, 'minItems' | 'freeItemCount' | 'freeEveryItems' | 'freeMaxItems'>): number {
  if (paidCount < s.minItems) return 0;
  const bonus = Math.floor((paidCount - s.minItems) / Math.max(1, s.freeEveryItems));
  return Math.min(s.freeMaxItems, s.freeItemCount + bonus);
}

type BonusSettings = Pick<Settings, 'bonusStartCents' | 'bonusStepCents' | 'bonusMaxItemCents' | 'bonusMaxItems' | 'freeShelf'>;

/** Free paid items earned by spend: one at `bonusStartCents`, then one more per `bonusStepCents`, capped. */
export function bonusCountFor(subtotal: number, s: Pick<Settings, 'bonusStartCents' | 'bonusStepCents' | 'bonusMaxItems'>): number {
  if (subtotal < s.bonusStartCents) return 0;
  return Math.min(s.bonusMaxItems, 1 + Math.floor((subtotal - s.bonusStartCents) / Math.max(1, s.bonusStepCents)));
}

/** Items a customer may take free: sellable shelf items at or under the price limit. */
export const isBonusEligible = (it: Pick<CartItem, 'available' | 'shelf' | 'unitPriceCents'>, s: BonusSettings): boolean =>
  it.available && it.shelf !== s.freeShelf && it.unitPriceCents <= s.bonusMaxItemCents;

/** The spend bonus is optional: up to `bonusCountFor(subtotal)` units, each an eligible paid item. */
export function validateBonusItems(bonus: CartLines, catalog: CartItem[], s: BonusSettings, subtotal: number): CartError[] {
  const errors: CartError[] = [];
  const by = new Map(catalog.map((i) => [i.id, i]));
  for (const [id, q] of Object.entries(bonus)) {
    const it = by.get(id);
    if (!Number.isInteger(q) || q < 1 || !it || !isBonusEligible(it, s)) errors.push({ code: 'bad_bonus', itemId: id });
  }
  if (countItems(bonus) > bonusCountFor(subtotal, s)) errors.push({ code: 'bad_bonus' });
  return errors;
}

/** The free extras: exactly `freeCountFor(paidCount)` units, each an available non-Amway item from the free shelf (Cozy extras). */
export function validateFreeItems(free: CartLines, catalog: CartItem[], s: Pick<Settings, 'minItems' | 'freeItemCount' | 'freeEveryItems' | 'freeMaxItems' | 'freeShelf'>, paidCount: number): CartError[] {
  const errors: CartError[] = [];
  const by = new Map(catalog.map((i) => [i.id, i]));
  for (const [id, q] of Object.entries(free)) {
    const it = by.get(id);
    if (!Number.isInteger(q) || q < 1) errors.push({ code: 'bad_free', itemId: id });
    else if (!it || !it.available || it.kind !== 'other' || it.shelf !== s.freeShelf) errors.push({ code: 'bad_free', itemId: id });
  }
  if (countItems(free) !== freeCountFor(paidCount, s)) errors.push({ code: 'bad_free' });
  return errors;
}

export function validateCart(lines: CartLines, catalog: CartItem[], s: Pick<Settings, 'minItems'>): CartError[] {
  const errors: CartError[] = [];
  const by = new Map(catalog.map((i) => [i.id, i]));
  for (const [id, q] of Object.entries(lines)) {
    if (!Number.isInteger(q) || q < 1 || q > MAX_QTY_PER_ITEM) {
      errors.push({ code: 'bad_qty', itemId: id });
      continue;
    }
    const it = by.get(id);
    if (!it) errors.push({ code: 'unknown_item', itemId: id });
    else if (!it.available) errors.push({ code: 'unavailable', itemId: id });
  }
  if (countItems(lines) < s.minItems) errors.push({ code: 'too_few' });
  return errors;
}
