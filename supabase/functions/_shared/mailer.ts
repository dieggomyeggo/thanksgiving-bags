import type { Mail, Mailer } from './db.ts';

/** Resend REST API. `fetchFn` is injectable for tests. */
export function createResendMailer(o: { apiKey: string; from: string; replyTo: string; fetchFn?: typeof fetch }): Mailer {
  const f = o.fetchFn ?? fetch;
  return {
    async send(m: Mail) {
      const res = await f('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${o.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: o.from, to: [m.to], reply_to: o.replyTo, subject: m.subject, text: m.text, html: m.html }),
      });
      if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    },
  };
}

/** Used when RESEND_API_KEY is not configured (local dev, test project before DNS is verified): logs instead of sending. */
export function createLogMailer(): Mailer {
  return {
    async send(m: Mail) {
      console.log(`[mail not sent: no RESEND_API_KEY] to=${m.to} subject=${m.subject}`);
    },
  };
}
