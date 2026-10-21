// Public endpoint (verify_jwt = false). Honeypot, rate limit, server-side recomputation: see _shared/place-order.ts.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { CORS_HEADERS, json, preflight, sha256Hex } from '../_shared/http.ts';
import { createLogMailer, createResendMailer } from '../_shared/mailer.ts';
import { handlePlaceOrder } from '../_shared/place-order.ts';
import { createSupabaseDb } from '../_shared/supabase-db.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });
  let body: unknown;
  try { body = await req.json(); } catch { return json(422, { ok: false, error: 'invalid' }); }

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const key = Deno.env.get('RESEND_API_KEY');
  const mailer = key
    ? createResendMailer({ apiKey: key, from: Deno.env.get('MAIL_FROM')!, replyTo: Deno.env.get('MAIL_REPLY_TO')! })
    : createLogMailer();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const clientHash = await sha256Hex(`${ip}|${Deno.env.get('HASH_SALT') ?? 'tg'}`);

  try {
    const r = await handlePlaceOrder(body, { db: createSupabaseDb(sb), mailer, now: () => new Date(), rng: Math.random, clientHash });
    return json(r.status, r.body);
  } catch (e) {
    console.error('place-order failed', e);
    return json(500, { ok: false, error: 'server_error' });
  }
});
void CORS_HEADERS;
