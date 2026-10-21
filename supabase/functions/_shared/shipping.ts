import type { Method, Settings } from './types.ts';

export type LocalZone = 'near' | 'far' | 'out' | null;

export interface ShippingQuote {
  kind: 'ok' | 'quote' | 'blocked' | 'needs_zip';
  cents: number | null;
  label: string;
}

export function quoteShipping(a: {
  method: Method;
  zone: LocalZone;
  weightLb: number;
  settings: Pick<Settings, 'shipTiers' | 'farDeliveryCents'>;
}): ShippingQuote {
  const { method, zone, weightLb, settings } = a;
  if (method === 'pickup') return { kind: 'ok', cents: 0, label: 'Pickup: free' };
  if (method === 'deliver') {
    if (zone === null) return { kind: 'needs_zip', cents: null, label: 'Enter your ZIP to see delivery cost' };
    if (zone === 'near') return { kind: 'ok', cents: 0, label: 'Local delivery (within about 25 miles): free' };
    if (zone === 'far') {
      return { kind: 'ok', cents: settings.farDeliveryCents, label: 'Local delivery (25 miles to 1 hour): flat fee' };
    }
    return { kind: 'blocked', cents: null, label: 'Outside the delivery area: choose shipping or pickup' };
  }
  const tiers = [...settings.shipTiers].sort((x, y) => x.maxLb - y.maxLb);
  for (const t of tiers) {
    if (weightLb <= t.maxLb) return { kind: 'ok', cents: t.cents, label: `Shipping, up to ${t.maxLb} lb` };
  }
  return { kind: 'quote', cents: null, label: 'Over 8 lb: I will send you a shipping quote before you pay' };
}
