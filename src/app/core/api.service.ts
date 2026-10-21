import type {
  ItemRow, Method, OrderRow, PayMethod, PublicItem, Settings, StarterBag, ZipRow,
} from '@shared/types';

export interface PlaceOrderRequest {
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
  website: string; // honeypot
  expectedTotalCents: number;
}

export type PlaceOrderResult =
  | { ok: true; number: string; subtotalCents: number; shippingCents: number; totalCents: number; late: boolean; needsApproval: boolean; shippingQuoteNeeded: boolean }
  | { ok: false; error: string; details?: { code: string; itemId?: string }[]; totalCents?: number };

export interface Batch {
  id: string;
  label: string;
  batchDate: string;
  notes: string | null;
}

/** The ONLY surface components use to reach a backend. Implemented by SupabaseApiService and MockApiService. */
export abstract class ApiService {
  abstract readonly isMock: boolean;

  // Public (anon key): views never include item cost.
  abstract getCatalog(): Promise<PublicItem[]>;
  abstract getStarterBags(): Promise<StarterBag[]>;
  abstract getSettings(): Promise<Settings>;
  abstract getZips(): Promise<ZipRow[]>;
  abstract placeOrder(req: PlaceOrderRequest): Promise<PlaceOrderResult>;

  // Admin auth (magic link, one allowlisted email)
  abstract sessionEmail(): Promise<string | null>;
  abstract isAdmin(): Promise<boolean>;
  abstract signInWithEmail(email: string): Promise<void>;
  abstract signOut(): Promise<void>;

  // Admin data (RLS: admins only)
  abstract adminItems(): Promise<ItemRow[]>;
  abstract adminSaveItems(items: ItemRow[]): Promise<void>;
  abstract adminStarters(): Promise<StarterBag[]>;
  abstract adminSaveStarters(s: StarterBag[]): Promise<void>;
  abstract adminOrders(): Promise<OrderRow[]>;
  abstract adminUpdateOrder(id: string, patch: Partial<OrderRow>): Promise<void>;
  abstract adminDeleteTestOrders(): Promise<number>;
  abstract adminNotify(orderId: string, event: 'placed' | 'paid' | 'ready', force?: boolean): Promise<void>;
  abstract adminExpireUnpaid(): Promise<number>;
  abstract adminPurgePii(): Promise<number>;
  abstract adminSettings(): Promise<Settings>;
  abstract adminSaveSettings(s: Settings): Promise<void>;
  abstract adminZips(): Promise<ZipRow[]>;
  abstract adminSaveZips(z: ZipRow[]): Promise<void>;
  abstract adminBatches(): Promise<Batch[]>;
  abstract adminCreateBatch(b: Omit<Batch, 'id'>): Promise<Batch>;
}
