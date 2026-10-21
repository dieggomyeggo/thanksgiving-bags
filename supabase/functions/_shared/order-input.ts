import type { Method, PayMethod } from './types.ts';
import { normalizeZip } from './zip.ts';

export interface OrderInput {
  items: Record<string, number>;
  freeItems: Record<string, number>;
  method: Method;
  zip: string | null;
  address: string | null;
  name: string;
  email: string;
  phone: string | null;
  payMethod: PayMethod;
  optFollowup: boolean;
  optShoutout: boolean;
  notes: string | null;
  website: string; // honeypot, must be empty
  expectedTotalCents: number | null;
}

export type InputResult = { ok: true; value: OrderInput } | { ok: false; errors: string[] };

const METHODS: Method[] = ['pickup', 'deliver', 'ship'];
const PAYS: PayMethod[] = ['zelle', 'venmo', 'cashapp', 'cash'];
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;

// eslint-disable-next-line no-control-regex
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');

export function validateOrderInput(raw: unknown): InputResult {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const errors: string[] = [];

  const items: Record<string, number> = {};
  if (r['items'] && typeof r['items'] === 'object' && !Array.isArray(r['items'])) {
    for (const [k, v] of Object.entries(r['items'] as Record<string, unknown>)) items[k.slice(0, 64)] = typeof v === 'number' ? v : NaN;
  } else errors.push('items required');

  const freeItems: Record<string, number> = {};
  if (r['freeItems'] && typeof r['freeItems'] === 'object' && !Array.isArray(r['freeItems'])) {
    for (const [k, v] of Object.entries(r['freeItems'] as Record<string, unknown>)) freeItems[k.slice(0, 64)] = typeof v === 'number' ? v : NaN;
  }

  const method = r['method'] as Method;
  if (!METHODS.includes(method)) errors.push('method invalid');
  const payMethod = r['payMethod'] as PayMethod;
  if (!PAYS.includes(payMethod)) errors.push('payMethod invalid');

  const name = clean(r['name'], 100);
  if (!name) errors.push('name required');
  const email = clean(r['email'], 160).toLowerCase();
  if (!EMAIL.test(email)) errors.push('email invalid');

  const phone = clean(r['phone'], 30) || null;
  if (payMethod === 'cash' && !phone) errors.push('phone required for cash orders');

  const addressRaw = clean(r['address'], 200) || null;
  const zipRaw = clean(r['zip'], 12) || null;
  const zip = normalizeZip(zipRaw);
  if (method === 'deliver' || method === 'ship') {
    if (!addressRaw) errors.push('address required');
    if (!zip) errors.push('valid ZIP required');
  }

  const expected = r['expectedTotalCents'];
  const expectedTotalCents = typeof expected === 'number' && Number.isInteger(expected) ? expected : null;

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      items,
      freeItems,
      method,
      zip,
      address: method === 'pickup' ? null : addressRaw,
      name,
      email,
      phone,
      payMethod,
      optFollowup: r['optFollowup'] === true,
      optShoutout: r['optShoutout'] === true,
      notes: clean(r['notes'], 500) || null,
      website: typeof r['website'] === 'string' ? r['website'] : '',
      expectedTotalCents,
    },
  };
}
