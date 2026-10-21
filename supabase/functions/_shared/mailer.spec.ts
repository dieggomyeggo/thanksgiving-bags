import { describe, expect, it } from 'vitest';
import { createResendMailer } from './mailer.ts';

describe('resend mailer', () => {
  it('posts to Resend with reply-to and throws on failure', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const ok = createResendMailer({ apiKey: 'k', from: 'Bags <bags@example.com>', replyTo: 'me@gmail.com', fetchFn: async (u, i) => { calls.push({ url: String(u), init: i! }); return new Response('{}', { status: 200 }); } });
    await ok.send({ to: 'a@b.co', subject: 's', text: 't', html: 'h' });
    expect(calls[0].url).toBe('https://api.resend.com/emails');
    expect(JSON.parse(calls[0].init.body as string)).toMatchObject({ reply_to: 'me@gmail.com', to: ['a@b.co'] });
    const bad = createResendMailer({ apiKey: 'k', from: 'x', replyTo: 'y', fetchFn: async () => new Response('nope', { status: 403 }) });
    await expect(bad.send({ to: 'a@b.co', subject: 's', text: 't', html: 'h' })).rejects.toThrow(/403/);
  });
});
