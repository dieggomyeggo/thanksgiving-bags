// Core of the place-order Edge Function. The server recomputes every price, the shipping tier and lateness
// from the database; nothing the browser sends about money is trusted.
import { countItems, isLargeOrder, validateBonusItems, subtotalCents, validateCart, validateFreeItems, weightLb, type CartItem } from './cart.ts';
import { DuplicateNumberError, type Mailer, type ServerDb } from './db.ts';
import { renderEmail } from './emails.ts';
import { isLate } from './cutoffs.ts';
import { validateOrderInput } from './order-input.ts';
import { orderNumber } from './orders.ts';
import { quoteShipping, type LocalZone } from './shipping.ts';
import type { OrderLine } from './types.ts';
import { zoneFor } from './zip.ts';

export interface PlaceOrderDeps {
  db: ServerDb;
  mailer: Mailer;
  now: () => Date;
  rng: () => number;
  /** Opaque per-client hash (e.g. of the IP) used only for rate limiting; purged with the PII. */
  clientHash: string;
}

export interface HttpResult {
  status: number;
  body: Record<string, unknown>;
}

const RATE_LIMIT = 5; // orders per client or email per hour
function mergeLines(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] ?? 0) + v;
  return out;
}
const fail = (status: number, error: string, extra: Record<string, unknown> = {}): HttpResult => ({ status, body: { ok: false, error, ...extra } });

export async function handlePlaceOrder(raw: unknown, deps: PlaceOrderDeps): Promise<HttpResult> {
  const parsed = validateOrderInput(raw);
  if (!parsed.ok) return fail(422, 'invalid', { details: parsed.errors });
  const input = parsed.value;
  if (input.website) return fail(422, 'rejected');

  const now = deps.now();
  const since = new Date(now.getTime() - 3600_000).toISOString();
  if ((await deps.db.countOrdersSince({ clientHash: deps.clientHash, email: input.email }, since)) >= RATE_LIMIT) {
    return fail(429, 'rate_limited');
  }

  const [items, settings, zips] = await Promise.all([deps.db.getItems(), deps.db.getSettings(), deps.db.getZips()]);
  const catalog: (CartItem & { costCents: number; name: string })[] = items.map((i) => ({
    id: i.id, unitPriceCents: i.unitPriceCents, weightLb: i.weightLb, costCents: i.costCents, name: i.name, kind: i.kind, shelf: i.shelf,
    available: i.active && !i.soldOut && (i.stock === null || i.stock > 0),
  }));

  const problems: { code: string; itemId?: string }[] = validateCart(input.items, catalog, settings);
  problems.push(...validateFreeItems(input.freeItems, catalog, settings, countItems(input.items)));
  problems.push(...validateBonusItems(input.bonusItems, catalog, settings, subtotalCents(input.items, catalog)));
  // The free-gift shelf is gifts only: it cannot be bought.
  for (const id of Object.keys(input.items)) if (catalog.find((c) => c.id === id)?.shelf === settings.freeShelf) problems.push({ code: 'free_only', itemId: id });
  for (const [id, qty] of Object.entries(input.items)) {
    const it = items.find((i) => i.id === id);
    if (it && it.stock !== null && qty > it.stock && it.stock > 0) problems.push({ code: 'insufficient_stock', itemId: id });
  }

  let zone: LocalZone = null;
  if (input.method === 'deliver') {
    zone = zoneFor(input.zip, zips);
    if (zone === 'out' || zone === null) problems.push({ code: 'out_of_area' });
  }
  if (problems.length) return fail(422, 'invalid', { details: problems });

  const count = countItems(input.items);
  const subtotal = subtotalCents(input.items, catalog);
  const quote = quoteShipping({ method: input.method, zone, weightLb: weightLb({ ...mergeLines(mergeLines(input.items, input.freeItems), input.bonusItems) }, catalog, settings.packagingLb), settings });
  if (quote.kind === 'blocked' || quote.kind === 'needs_zip') return fail(422, 'invalid', { details: [{ code: 'out_of_area' }] });
  const shippingQuoteNeeded = quote.kind === 'quote';
  const shipping = quote.cents ?? 0;
  const total = subtotal + shipping;
  const needsApproval = isLargeOrder(count, settings) || shippingQuoteNeeded;

  if (input.expectedTotalCents !== null && input.expectedTotalCents !== total) {
    return fail(409, 'price_changed', { totalCents: total });
  }

  const late = isLate(input.method, now, settings);
  const lines: OrderLine[] = [
    ...Object.entries(input.items).map(([itemId, qty]) => {
      const it = catalog.find((c) => c.id === itemId)!;
      return { itemId, qty, unitPriceCents: it.unitPriceCents, unitCostCents: it.costCents };
    }),
    ...Object.entries({ ...input.freeItems, ...Object.fromEntries(Object.entries(input.bonusItems).map(([k, v]) => [k, (input.freeItems[k] ?? 0) + v])) }).map(([itemId, qty]) => {
      const it = catalog.find((c) => c.id === itemId)!;
      return { itemId, qty, unitPriceCents: 0, unitCostCents: it.costCents, free: true };
    }),
  ];

  let number = '';
  let id = '';
  for (let attempt = 0; ; attempt++) {
    number = orderNumber(deps.rng);
    try {
      ({ id } = await deps.db.insertOrder({
        number, method: input.method, zone: zone === 'near' || zone === 'far' ? zone : null, name: input.name, email: input.email,
        phone: input.phone, address: input.address, zip: input.zip, payMethod: input.payMethod, subtotalCents: subtotal,
        shippingCents: shipping, totalCents: total, shippingQuoteNeeded, late, needsApproval, optFollowup: input.optFollowup,
        optShoutout: input.optShoutout, notes: input.notes, test: /^test\b/i.test(input.name), clientHash: deps.clientHash, lines,
      }));
      break;
    } catch (e) {
      if (!(e instanceof DuplicateNumberError) || attempt >= 8) throw e;
    }
  }

  // Email failure must not lose the order; the owner can resend from the admin.
  try {
    const mail = renderEmail('placed', {
      number, name: input.name, method: input.method, payMethod: input.payMethod,
      lines: lines.map((l) => ({ name: catalog.find((c) => c.id === l.itemId)!.name, qty: l.qty, totalCents: l.qty * l.unitPriceCents, free: l.free })),
      subtotalCents: subtotal, shippingCents: shipping, totalCents: total, shippingQuoteNeeded, needsApproval, late,
      tracking: null, readyWindow: null,
    }, settings);
    await deps.mailer.send({ to: input.email, ...mail });
    await deps.db.markEmailSent(id, 'placed', now.toISOString());
  } catch (e) {
    console.error('placed email failed', number, e instanceof Error ? e.message : e);
  }

  return {
    status: 200,
    body: { ok: true, number, subtotalCents: subtotal, shippingCents: shipping, totalCents: total, late, needsApproval, shippingQuoteNeeded },
  };
}
