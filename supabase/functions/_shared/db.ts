import type { ItemRow, OrderRow, Settings, ZipRow } from './types.ts';

export type NewOrder = Omit<OrderRow, 'id' | 'createdAt' | 'paidAt' | 'piiPurgedAt' | 'emailsSent' | 'status' | 'tracking' | 'readyWindow' | 'cashConfirmed' | 'adjustmentCents' | 'batchId'>;

export class DuplicateNumberError extends Error {
  constructor() {
    super('duplicate order number');
  }
}

/** Server-side data access used by the Edge Function cores. Implemented by Supabase (service role) and by memory-db for tests and the mock API. */
export interface ServerDb {
  getItems(): Promise<ItemRow[]>;
  getSettings(): Promise<Settings>;
  getZips(): Promise<ZipRow[]>;
  countOrdersSince(filter: { clientHash?: string; email?: string }, sinceIso: string): Promise<number>;
  /** Throws DuplicateNumberError when the order number is taken. */
  insertOrder(order: NewOrder): Promise<{ id: string }>;
  getOrder(id: string): Promise<OrderRow | null>;
  markEmailSent(orderId: string, kind: string, atIso: string): Promise<void>;
  expireUnpaid(hours: number, now: Date): Promise<number>;
  purgePii(now: Date): Promise<number>;
}

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}
