// Row <-> domain mapping for Supabase tables (snake_case rows) used by both the Angular SupabaseApi and the Edge Functions.
import { mergeSettings } from './settings.ts';
import type { ItemRow, OrderLine, OrderRow, PublicItem, Settings, StarterBag, ZipRow } from './types.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export function itemFromRow(r: Row): ItemRow {
  return {
    id: r['id'], shelf: r['shelf'], name: r['name'], kind: r['kind'],
    costCents: r['cost_cents'], retailCents: r['retail_cents'] ?? null,
    pv: r['pv'] == null ? null : Number(r['pv']), bv: r['bv'] == null ? null : Number(r['bv']),
    weightLb: Number(r['weight_lb']), boxSize: r['box_size'], tags: r['tags'] ?? {},
    tagsVerified: !!r['tags_verified'], individuallyWrapped: !!r['individually_wrapped'],
    stock: r['stock'] ?? null, soldOut: !!r['sold_out'], active: !!r['active'], sort: r['sort'] ?? 0,
    unitPriceCents: r['unit_price_cents'],
  };
}

export function itemToRow(i: ItemRow): Row {
  return {
    id: i.id, shelf: i.shelf, name: i.name, kind: i.kind, cost_cents: i.costCents, retail_cents: i.retailCents,
    pv: i.pv, bv: i.bv, weight_lb: i.weightLb, box_size: i.boxSize, tags: i.tags, tags_verified: i.tagsVerified,
    individually_wrapped: i.individuallyWrapped, stock: i.stock, sold_out: i.soldOut, active: i.active, sort: i.sort,
    unit_price_cents: i.unitPriceCents,
  };
}

export function publicItemFromRow(r: Row): PublicItem {
  return {
    id: r['id'], shelf: r['shelf'], name: r['name'], kind: r['kind'], unitPriceCents: r['unit_price_cents'],
    weightLb: Number(r['weight_lb']), tags: r['tags'] ?? {}, tagsVerified: !!r['tags_verified'], sort: r['sort'] ?? 0,
  };
}

export function starterFromRow(r: Row): StarterBag {
  return { id: r['id'], name: r['name'], blurb: r['blurb'] ?? '', items: r['items'] ?? {}, sort: r['sort'] ?? 0 };
}

export function zipFromRow(r: Row): ZipRow {
  return { zip: r['zip'], zone: r['zone'] };
}

export function settingsFromRows(rows: { key: string; value: unknown }[]): Settings {
  const o: Row = {};
  for (const r of rows) o[r.key] = r.value;
  return mergeSettings(o as Partial<Settings>);
}

export function settingsToRows(s: Settings): { key: string; value: unknown }[] {
  return Object.entries(s).map(([key, value]) => ({ key, value }));
}

export function orderFromRow(r: Row, lines: Row[] = []): OrderRow {
  return {
    id: r['id'], number: r['number'], status: r['status'], method: r['method'], zone: r['zone'] ?? null,
    name: r['name'] ?? null, email: r['email'] ?? null, phone: r['phone'] ?? null, address: r['address'] ?? null,
    zip: r['zip'] ?? null, payMethod: r['pay_method'], subtotalCents: r['subtotal_cents'],
    shippingCents: r['shipping_cents'], totalCents: r['total_cents'],
    shippingQuoteNeeded: !!r['shipping_quote_needed'], late: !!r['late'], needsApproval: !!r['needs_approval'],
    optFollowup: !!r['opt_followup'], optShoutout: !!r['opt_shoutout'], tracking: r['tracking'] ?? null,
    readyWindow: r['ready_window'] ?? null, notes: r['notes'] ?? null, test: !!r['test'],
    cashConfirmed: !!r['cash_confirmed'], adjustmentCents: r['adjustment_cents'] ?? 0, batchId: r['batch_id'] ?? null,
    clientHash: r['client_hash'] ?? null, emailsSent: r['emails_sent'] ?? {}, createdAt: r['created_at'],
    paidAt: r['paid_at'] ?? null, piiPurgedAt: r['pii_purged_at'] ?? null,
    lines: lines.map(lineFromRow),
  };
}

export function lineFromRow(r: Row): OrderLine {
  return { itemId: r['item_id'], qty: r['qty'], unitPriceCents: r['unit_price_cents'], unitCostCents: r['unit_cost_cents'], free: !!r['free'] };
}

/** Patch an admin can apply to an order (camelCase -> snake_case). */
export function orderPatchToRow(p: Partial<OrderRow>): Row {
  const map: Record<string, string> = {
    status: 'status', tracking: 'tracking', readyWindow: 'ready_window', notes: 'notes', test: 'test',
    cashConfirmed: 'cash_confirmed', adjustmentCents: 'adjustment_cents', batchId: 'batch_id',
    needsApproval: 'needs_approval', paidAt: 'paid_at', shippingCents: 'shipping_cents', totalCents: 'total_cents',
    shippingQuoteNeeded: 'shipping_quote_needed',
  };
  const out: Row = {};
  for (const [k, v] of Object.entries(p)) if (map[k]) out[map[k]] = v;
  return out;
}
