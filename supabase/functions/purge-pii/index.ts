// Admin-triggered: nulls name/email/phone/address on all orders and keeps the anonymous rows for the donation totals.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handlePurgePii } from '../_shared/maintenance.ts';
import { json, preflight } from '../_shared/http.ts';
import { createSupabaseDb } from '../_shared/supabase-db.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /i, '');
  const { data: u } = await sb.auth.getUser(token);
  const email = u.user?.email?.toLowerCase();
  const { data: admin } = email ? await sb.from('admins').select('email').eq('email', email).maybeSingle() : { data: null };
  if (!admin) return json(403, { ok: false, error: 'forbidden' });
  const r = await handlePurgePii({ db: createSupabaseDb(sb), now: () => new Date() });
  return json(r.status, r.body);
});
