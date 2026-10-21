// Cancels unpaid Placed orders after settings.unpaidExpiryHours. Callable by an admin JWT or by the service role
// (for an external scheduler). The default schedule uses pg_cron directly: see supabase/optional/cron.sql.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleExpireUnpaid } from '../_shared/maintenance.ts';
import { json, preflight } from '../_shared/http.ts';
import { createSupabaseDb } from '../_shared/supabase-db.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /i, '');
  let allowed = token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!allowed) {
    const { data: u } = await sb.auth.getUser(token);
    const email = u.user?.email?.toLowerCase();
    const { data: admin } = email ? await sb.from('admins').select('email').eq('email', email).maybeSingle() : { data: null };
    allowed = !!admin;
  }
  if (!allowed) return json(403, { ok: false, error: 'forbidden' });
  const r = await handleExpireUnpaid({ db: createSupabaseDb(sb), now: () => new Date() });
  return json(r.status, r.body);
});
