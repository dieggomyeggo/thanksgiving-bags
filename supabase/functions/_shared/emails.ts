// The three customer emails. Pure templates; no "proceeds", no claims, no marks. Owner's home address is never included.
import { lateNotice, prettyDate } from './cutoffs.ts';
import { charityLabel } from './settings.ts';
import type { Method, PayMethod, Settings } from './types.ts';

export type EmailKind = 'placed' | 'paid' | 'ready';

export interface EmailOrder {
  number: string;
  name: string;
  method: Method;
  payMethod: PayMethod;
  lines: { name: string; qty: number; totalCents: number; free?: boolean }[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  shippingQuoteNeeded: boolean;
  needsApproval: boolean;
  late: boolean;
  tracking: string | null;
  readyWindow: string | null;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function paymentInstructions(pay: PayMethod, number: string, s: Pick<Settings, 'payments'>): string {
  switch (pay) {
    case 'zelle': return `Send Zelle to ${s.payments.zelle}.`;
    case 'venmo': return `Send via Venmo (business/goods) to ${s.payments.venmo}.`;
    case 'cashapp': return `Send via Cash App (business) to ${s.payments.cashapp}.`;
    case 'cash': return 'Pay cash when your bag is delivered or picked up. I will text you to confirm.';
  }
}

function summaryText(o: EmailOrder): string {
  const lines = o.lines.map((l) => `  ${l.qty} x ${l.name}  ${l.free ? 'FREE' : money(l.totalCents)}`).join('\n');
  const ship = o.shippingQuoteNeeded ? 'to be quoted' : money(o.shippingCents);
  const total = o.shippingQuoteNeeded ? `${money(o.totalCents)} + shipping` : money(o.totalCents);
  return `${lines}\n  Items: ${money(o.subtotalCents)}\n  Delivery/shipping: ${ship}\n  Total: ${total}`;
}

function cutoffText(s: Settings): string {
  return `Thanksgiving cutoffs: shipping orders by ${prettyDate(s.cutoffShip)}, local delivery and pickup by ${prettyDate(s.cutoffLocal)}. Ordering stays open through ${prettyDate(s.orderingCloses)}.`;
}

function signoff(s: Settings): string {
  return `Thank you,\n${s.ownerFirstName}\nReply to this email or text ${s.contactPhone}`;
}

export function renderEmail(kind: EmailKind, o: EmailOrder, s: Settings): RenderedEmail {
  const parts: string[] = [`Hi ${o.name},`, ''];
  let subject = '';
  if (kind === 'placed') {
    subject = `Your Thanksgiving bag order ${o.number}`;
    parts.push(`Thanks for your order ${o.number}! 100% of my profit from these bags, plus the Amway bonus I earn from them, goes to ${charityLabel(s)}.`, '', summaryText(o), '');
    if (o.needsApproval || o.shippingQuoteNeeded) {
      parts.push(
        o.shippingQuoteNeeded
          ? 'Your order needs a shipping quote. I will email or text you the cost and payment steps before you pay. Please do not send payment yet.'
          : 'Your order is on the larger side, so I will confirm availability with you before you pay. Please do not send payment yet.',
      );
    } else {
      parts.push(`How to pay: ${paymentInstructions(o.payMethod, o.number, s)} Put ${o.number} in the memo. Unpaid orders are released after ${s.unpaidExpiryHours} hours${o.payMethod === 'cash' ? ' (cash orders are confirmed by text instead)' : ''}.`);
    }
    parts.push('', cutoffText(s));
    if (o.late) parts.push(lateNotice(o.method, s));
    if (o.method === 'pickup') parts.push(s.pickupNote);
  } else if (kind === 'paid') {
    subject = `Payment received for ${o.number}, thank you!`;
    parts.push(`I got your payment for order ${o.number}. Thank you! I'll place the Amway order for the next batch and email you again when your bag is ready.`);
    if (o.late) parts.push(lateNotice(o.method, s));
  } else {
    subject = `Your Thanksgiving bag ${o.number} is ready`;
    const verb = o.method === 'ship' ? 'is packed and on its way' : o.method === 'deliver' ? 'is ready for delivery' : 'is ready for pickup';
    parts.push(`Your bag ${o.number} ${verb}.`);
    if (o.readyWindow) parts.push(`${o.method === 'ship' ? 'Expected' : 'Window'}: ${o.readyWindow}`);
    if (o.method === 'ship' && o.tracking) parts.push(`USPS tracking: ${o.tracking}`);
    if (o.method === 'pickup') parts.push(s.pickupNote);
    parts.push('Your bag includes a handwritten thank-you card.');
  }
  parts.push('', signoff(s));
  const text = parts.join('\n');
  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#2a2118">${parts
    .map((p) => (p === '' ? '<br>' : `<div style="white-space:pre-wrap">${esc(p)}</div>`))
    .join('')}</div>`;
  return { subject, text, html };
}
