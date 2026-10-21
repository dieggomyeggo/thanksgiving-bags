// Admin-invoked: sends email 2 ("paid") / 3 ("ready"), or re-sends email 1 after approval of a large order.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleNotify } from '../_shared/notify.ts';
import { json, preflight } from '../_shared/http.ts';
import { createLogMailer, createResendMailer } from '../_shared/mailer.ts';
import { createSupabaseDb } from '../_shared/supabase-db.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const sb = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /i, '');
  const { data: u } = await sb.auth.getUser(token);
  const email = u.user?.email?.toLowerCase();
  const { data: admin } = email ? await sb.from('admins').select('email').eq('email', email).maybeSingle() : { data: null };
  if (!admin) return json(403, { ok: false, error: 'forbidden' });

  let body: unknown;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: 'invalid' }); }
  const key = Deno.env.get('RESEND_API_KEY');
  const mailer = key
    ? createResendMailer({ apiKey: key, from: Deno.env.get('MAIL_FROM')!, replyTo: Deno.env.get('MAIL_REPLY_TO')! })
    : createLogMailer();
  const r = await handleNotify(body, { db: createSupabaseDb(sb), mailer, now: () => new Date() });
  return json(r.status, r.body);
});
