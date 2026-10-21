import type { Settings } from './types.ts';

/** Hardcoded fallback settings (the cut line: the site works with these alone). Placeholders until the owner confirms. */
export const DEFAULT_SETTINGS: Settings = {
  cutoffShip: '2026-11-08',
  cutoffLocal: '2026-11-12',
  orderingCloses: '2026-11-30',
  shipTiers: [
    { maxLb: 2, cents: 1100 },
    { maxLb: 4, cents: 1500 },
    { maxLb: 8, cents: 2200 },
  ],
  farDeliveryCents: 500,
  packagingLb: 0.5,
  minItems: 3,
  largeOrderItems: 20,
  unpaidExpiryHours: 48,
  charityName: null,
  ownerFirstName: '[Owner first name]',
  contactEmail: '[dedicated Gmail]',
  contactPhone: '[text-capable phone]',
  payments: {
    zelle: '[owner Zelle phone/email]',
    venmo: '[@venmo-business-handle]',
    cashapp: '[$cashtag]',
  },
  learnMoreUrl: '',
  pickupNote: 'Pickup in the Johnston, IA area. Exact spot sent after you order.',
  totals: { published: false, profitCents: 0, bonusCents: 0, updatedAt: null },
};

/** Charity wording. Named only when written permission is on file (settings.charityName set). */
export function charityLabel(s: Pick<Settings, 'charityName'>): string {
  return s.charityName?.trim() || 'a local Des Moines-area soup kitchen (named here when confirmed)';
}

export function mergeSettings(overrides: Partial<Settings> | null | undefined): Settings {
  const o = overrides ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...o,
    payments: { ...DEFAULT_SETTINGS.payments, ...(o.payments ?? {}) },
    totals: { ...DEFAULT_SETTINGS.totals, ...(o.totals ?? {}) },
    shipTiers: o.shipTiers?.length ? o.shipTiers : DEFAULT_SETTINGS.shipTiers,
  };
}
