// ServerDb on Supabase using the SERVICE ROLE client (Edge Functions only; the key never reaches the browser).
// The client is typed loosely so this file type-checks without Deno or the supabase-js types.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { DuplicateNumberError, type NewOrder, type ServerDb } from './db.ts';
import { itemFromRow, orderFromRow, settingsFromRows, zipFromRow } from './mappers.ts';

function check<T>(res: { data: T; error: any }): T {
  if (res.error) throw Object.assign(new Error(res.error.message ?? 'db error'), { code: res.error.code });
  return res.data;
}

export function createSupabaseDb(sb: any): ServerDb {
  return {
    async getItems() { return (check(await sb.from('items').select('*')) as any[]).map(itemFromRow); },
    async getSettings() { return settingsFromRows(check(await sb.from('settings').select('key,value'))); },
    async getZips() { return (check(await sb.from('zips').select('*')) as any[]).map(zipFromRow); },

    async countOrdersSince(f, sinceIso) {
      const ors = [f.clientHash ? `client_hash.eq.${f.clientHash}` : null, f.email ? `email.eq.${f.email}` : null].filter(Boolean);
      if (!ors.length) return 0;
      const res = await sb.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', sinceIso).or(ors.join(','));
      if (res.error) throw new Error(res.error.message);
      return res.count ?? 0;
    },

    async insertOrder(o: NewOrder) {
      const orderJson = {
        number: o.number, method: o.method, zone: o.zone ?? '', name: o.name, email: o.email, phone: o.phone ?? '', address: o.address ?? '',
        zip: o.zip ?? '', pay_method: o.payMethod, subtotal_cents: o.subtotalCents, shipping_cents: o.shippingCents, total_cents: o.totalCents,
        shipping_quote_needed: o.shippingQuoteNeeded, late: o.late, needs_approval: o.needsApproval, opt_followup: o.optFollowup,
        opt_shoutout: o.optShoutout, notes: o.notes ?? '', test: o.test, client_hash: o.clientHash,
      };
      const linesJson = o.lines.map((l) => ({ item_id: l.itemId, qty: l.qty, unit_price_cents: l.unitPriceCents, unit_cost_cents: l.unitCostCents }));
      const res = await sb.rpc('place_order', { o: orderJson, lines: linesJson });
      if (res.error) {
        if (res.error.code === '23505') throw new DuplicateNumberError();
        throw new Error(res.error.message);
      }
      return { id: res.data as string };
    },

    async getOrder(id: string) {
      const res = await sb.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle();
      if (res.error) throw new Error(res.error.message);
      if (!res.data) return null;
      return orderFromRow(res.data, res.data.order_items ?? []);
    },

    async markEmailSent(orderId, kind, atIso) {
      const cur = check(await sb.from('orders').select('emails_sent').eq('id', orderId).single()) as any;
      check(await sb.from('orders').update({ emails_sent: { ...(cur.emails_sent ?? {}), [kind]: atIso } }).eq('id', orderId));
    },

    async expireUnpaid(hours) { return check(await sb.rpc('expire_unpaid_orders', { hours })) as number; },
    async purgePii() { return check(await sb.rpc('purge_order_pii')) as number; },
  };
}
