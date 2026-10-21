import type { ServerDb } from './db.ts';
import type { HttpResult } from './place-order.ts';

export interface MaintenanceDeps {
  db: ServerDb;
  now: () => Date;
}

/** Cancels unpaid Placed orders older than settings.unpaidExpiryHours (cash and approval-pending orders are exempt). */
export async function handleExpireUnpaid(deps: MaintenanceDeps): Promise<HttpResult> {
  const settings = await deps.db.getSettings();
  const expired = await deps.db.expireUnpaid(settings.unpaidExpiryHours, deps.now());
  return { status: 200, body: { ok: true, expired } };
}

/** Admin-triggered: null name/email/phone/address, keep the anonymous order rows for the donation totals. */
export async function handlePurgePii(deps: MaintenanceDeps): Promise<HttpResult> {
  const purged = await deps.db.purgePii(deps.now());
  return { status: 200, body: { ok: true, purged } };
}
