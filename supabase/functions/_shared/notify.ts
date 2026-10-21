import type { Mailer, ServerDb } from './db.ts';
import { renderEmail, type EmailKind } from './emails.ts';
import type { HttpResult } from './place-order.ts';

export interface NotifyDeps {
  db: ServerDb;
  mailer: Mailer;
  now: () => Date;
}

const KINDS: EmailKind[] = ['placed', 'paid', 'ready'];

/** Admin-triggered: email 2 ("paid") and email 3 ("ready"); `placed` can be re-sent after the owner approves a large order. */
export async function handleNotify(raw: unknown, deps: NotifyDeps): Promise<HttpResult> {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const event = r['event'] as EmailKind;
  if (!KINDS.includes(event)) return { status: 400, body: { ok: false, error: 'unknown_event' } };
  const order = typeof r['orderId'] === 'string' ? await deps.db.getOrder(r['orderId']) : null;
  if (!order) return { status: 404, body: { ok: false, error: 'not_found' } };
  if (!order.email || !order.name) return { status: 409, body: { ok: false, error: 'pii_purged' } };
  if (order.emailsSent[event] && r['force'] !== true) return { status: 200, body: { ok: true, skipped: true } };

  const [items, settings] = await Promise.all([deps.db.getItems(), deps.db.getSettings()]);
  const names = new Map(items.map((i) => [i.id, i.name]));
  const mail = renderEmail(event, {
    number: order.number, name: order.name, method: order.method, payMethod: order.payMethod,
    lines: order.lines.map((l) => ({ name: names.get(l.itemId) ?? l.itemId, qty: l.qty, totalCents: l.qty * l.unitPriceCents })),
    subtotalCents: order.subtotalCents, shippingCents: order.shippingCents, totalCents: order.totalCents,
    shippingQuoteNeeded: order.shippingQuoteNeeded, needsApproval: order.needsApproval, late: order.late,
    tracking: order.tracking, readyWindow: order.readyWindow,
  }, settings);
  try {
    await deps.mailer.send({ to: order.email, ...mail });
  } catch (e) {
    return { status: 502, body: { ok: false, error: 'email_failed', message: e instanceof Error ? e.message : 'unknown' } };
  }
  await deps.db.markEmailSent(order.id, event, deps.now().toISOString());
  return { status: 200, body: { ok: true } };
}
