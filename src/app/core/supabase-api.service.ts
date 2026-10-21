import { Injectable, inject } from '@angular/core';
import {
  itemFromRow, itemToRow, orderFromRow, orderPatchToRow, publicItemFromRow, settingsFromRows, settingsToRows,
  starterFromRow, zipFromRow,
} from '@shared/mappers';
import type { ItemRow, OrderRow, PublicItem, Settings, StarterBag, ZipRow } from '@shared/types';
import { ApiService, type Batch, type PlaceOrderRequest, type PlaceOrderResult } from './api.service';
import { SupabaseService } from './supabase.service';

/* eslint-disable @typescript-eslint/no-explicit-any */
function ok<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

@Injectable()
export class SupabaseApiService extends ApiService {
  readonly isMock = false;
  private readonly sb = inject(SupabaseService).client;

  async getCatalog(): Promise<PublicItem[]> {
    return (ok(await this.sb.from('public_catalog').select('*').order('sort')) as any[]).map(publicItemFromRow);
  }
  async getStarterBags(): Promise<StarterBag[]> {
    return (ok(await this.sb.from('starter_bags').select('*').order('sort')) as any[]).map(starterFromRow);
  }
  async getSettings(): Promise<Settings> {
    return settingsFromRows(ok(await this.sb.from('public_settings').select('key,value')) as any[]);
  }
  async getZips(): Promise<ZipRow[]> {
    return (ok(await this.sb.from('zips').select('*')) as any[]).map(zipFromRow);
  }
  async placeOrder(req: PlaceOrderRequest): Promise<PlaceOrderResult> {
    const { data, error } = await this.sb.functions.invoke('place-order', { body: req });
    if (data && typeof data === 'object') return data as PlaceOrderResult;
    // Non-2xx responses surface as FunctionsHttpError with the JSON body on error.context.
    const ctx = (error as any)?.context;
    if (ctx?.json) {
      try { return (await ctx.json()) as PlaceOrderResult; } catch { /* fall through */ }
    }
    return { ok: false, error: 'network' };
  }

  async sessionEmail(): Promise<string | null> {
    const { data } = await this.sb.auth.getSession();
    return data.session?.user.email?.toLowerCase() ?? null;
  }
  async isAdmin(): Promise<boolean> {
    const email = await this.sessionEmail();
    if (!email) return false;
    const { data } = await this.sb.from('admins').select('email').eq('email', email).maybeSingle();
    return !!data;
  }
  async signInWithEmail(email: string): Promise<void> {
    const redirect = `${location.origin}${document.baseURI.replace(location.origin, '')}admin`;
    const { error } = await this.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
    if (error) throw new Error(error.message);
  }
  async signOut(): Promise<void> { await this.sb.auth.signOut(); }

  async adminItems(): Promise<ItemRow[]> {
    return (ok(await this.sb.from('items').select('*').order('sort')) as any[]).map(itemFromRow);
  }
  async adminSaveItems(items: ItemRow[]): Promise<void> {
    ok(await this.sb.from('items').upsert(items.map(itemToRow), { onConflict: 'id' }));
  }
  async adminStarters(): Promise<StarterBag[]> {
    return (ok(await this.sb.from('starter_bags').select('*').order('sort')) as any[]).map(starterFromRow);
  }
  async adminSaveStarters(s: StarterBag[]): Promise<void> {
    ok(await this.sb.from('starter_bags').upsert(s.map((x) => ({ id: x.id, name: x.name, blurb: x.blurb, items: x.items, sort: x.sort, active: true }))));
  }
  async adminOrders(): Promise<OrderRow[]> {
    const rows = ok(await this.sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false })) as any[];
    return rows.map((r) => orderFromRow(r, r.order_items ?? []));
  }
  async adminUpdateOrder(id: string, patch: Partial<OrderRow>): Promise<void> {
    const row = orderPatchToRow(patch);
    if (patch.status === 'paid') row['paid_at'] = new Date().toISOString();
    ok(await this.sb.from('orders').update(row).eq('id', id));
  }
  async adminDeleteTestOrders(): Promise<number> {
    const rows = ok(await this.sb.from('orders').delete().eq('test', true).select('id')) as any[];
    return rows.length;
  }
  async adminNotify(orderId: string, event: 'placed' | 'paid' | 'ready', force = false): Promise<void> {
    const { data, error } = await this.sb.functions.invoke('notify', { body: { orderId, event, force } });
    if (error || (data && data.ok === false)) throw new Error(data?.error ?? error?.message ?? 'notify failed');
  }
  async adminExpireUnpaid(): Promise<number> {
    const { data, error } = await this.sb.functions.invoke('expire-unpaid', { body: {} });
    if (error) throw new Error(error.message);
    return data.expired as number;
  }
  async adminPurgePii(): Promise<number> {
    const { data, error } = await this.sb.functions.invoke('purge-pii', { body: {} });
    if (error) throw new Error(error.message);
    return data.purged as number;
  }
  async adminSettings(): Promise<Settings> {
    return settingsFromRows(ok(await this.sb.from('settings').select('key,value')) as any[]);
  }
  async adminSaveSettings(s: Settings): Promise<void> {
    ok(await this.sb.from('settings').upsert(settingsToRows(s), { onConflict: 'key' }));
  }
  async adminZips(): Promise<ZipRow[]> { return this.getZips(); }
  async adminSaveZips(z: ZipRow[]): Promise<void> {
    ok(await this.sb.from('zips').delete().neq('zip', ''));
    if (z.length) ok(await this.sb.from('zips').insert(z));
  }
  async adminBatches(): Promise<Batch[]> {
    return (ok(await this.sb.from('batches').select('*').order('batch_date')) as any[]).map((r) => ({
      id: r.id, label: r.label, batchDate: r.batch_date, notes: r.notes ?? null,
    }));
  }
  async adminCreateBatch(b: Omit<Batch, 'id'>): Promise<Batch> {
    const r = ok(await this.sb.from('batches').insert({ label: b.label, batch_date: b.batchDate, notes: b.notes }).select().single()) as any;
    return { id: r.id, label: r.label, batchDate: r.batch_date, notes: r.notes ?? null };
  }
}
