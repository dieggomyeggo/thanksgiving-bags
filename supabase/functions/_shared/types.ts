// Pure types shared by the Angular app and the Edge Functions. No Deno or browser APIs.
// All money is integer cents.

export type ItemKind = 'amway' | 'other';
export type Method = 'pickup' | 'deliver' | 'ship';
export type Zone = 'near' | 'far';
export type PayMethod = 'zelle' | 'venmo' | 'cashapp' | 'cash';
export type OrderStatus =
  | 'placed'
  | 'paid'
  | 'ordered'
  | 'packed'
  | 'delivered'
  | 'shipped'
  | 'picked_up'
  | 'cancelled'
  | 'expired';

export interface ItemTags {
  caffeineMg?: number | null;
  sugarFree?: boolean;
  organic?: boolean;
  vegan?: boolean;
  nsf?: string | null;
  allergens?: string[];
}

/** Full item row as stored on the server. `costCents` must never reach the browser's public views. */
export interface ItemRow {
  id: string;
  shelf: string;
  name: string;
  kind: ItemKind;
  costCents: number;
  retailCents: number | null;
  pv: number | null;
  bv: number | null;
  weightLb: number;
  boxSize: number;
  tags: ItemTags;
  tagsVerified: boolean;
  individuallyWrapped: boolean;
  stock: number | null;
  soldOut: boolean;
  active: boolean;
  sort: number;
  unitPriceCents: number;
}

/** What the browser sees (`public_catalog` view): no cost, no PV/BV, no retail, no stock count. */
export interface PublicItem {
  id: string;
  shelf: string;
  name: string;
  kind: ItemKind;
  unitPriceCents: number;
  weightLb: number;
  tags: ItemTags;
  tagsVerified: boolean;
  sort: number;
}

export interface StarterBag {
  id: string;
  name: string;
  blurb: string;
  items: Record<string, number>;
  sort: number;
}

export interface ShipTier {
  maxLb: number;
  cents: number;
}

export interface Settings {
  cutoffShip: string; // YYYY-MM-DD, inclusive, America/Chicago
  cutoffLocal: string;
  orderingCloses: string;
  shipTiers: ShipTier[];
  farDeliveryCents: number;
  packagingLb: number;
  minItems: number;
  largeOrderItems: number; // an order with MORE than this many items needs owner approval
  unpaidExpiryHours: number;
  charityName: string | null; // null until written permission is on file
  ownerFirstName: string;
  contactEmail: string;
  contactPhone: string;
  payments: { zelle: string; venmo: string; cashapp: string };
  learnMoreUrl: string;
  pickupNote: string;
  totals: PublishedTotals;
}

export interface PublishedTotals {
  published: boolean;
  profitCents: number;
  bonusCents: number;
  updatedAt: string | null;
}

export interface ZipRow {
  zip: string;
  zone: Zone;
}

export interface OrderLine {
  itemId: string;
  qty: number;
  unitPriceCents: number;
  unitCostCents: number;
}

export interface OrderRow {
  id: string;
  number: string;
  status: OrderStatus;
  method: Method;
  zone: Zone | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  zip: string | null;
  payMethod: PayMethod;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  shippingQuoteNeeded: boolean;
  late: boolean;
  needsApproval: boolean;
  optFollowup: boolean;
  optShoutout: boolean;
  tracking: string | null;
  readyWindow: string | null;
  notes: string | null;
  test: boolean;
  cashConfirmed: boolean;
  adjustmentCents: number;
  batchId: string | null;
  clientHash: string | null;
  emailsSent: Record<string, string>;
  createdAt: string;
  paidAt: string | null;
  piiPurgedAt: string | null;
  lines: OrderLine[];
}
