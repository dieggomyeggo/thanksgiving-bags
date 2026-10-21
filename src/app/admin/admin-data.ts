import { Injectable, inject, signal } from '@angular/core';
import type { ItemRow, OrderRow, Settings } from '@shared/types';
import { ApiService, type Batch } from '../core/api.service';

/** Shared admin state so the Catalog, Orders, Rollup and Settings tabs see the same data. */
@Injectable({ providedIn: 'root' })
export class AdminData {
  readonly api = inject(ApiService);
  readonly items = signal<ItemRow[]>([]);
  readonly orders = signal<OrderRow[]>([]);
  readonly batches = signal<Batch[]>([]);
  readonly settings = signal<Settings | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const [items, orders, batches, settings] = await Promise.all([
        this.api.adminItems(), this.api.adminOrders(), this.api.adminBatches(), this.api.adminSettings(),
      ]);
      this.items.set(items);
      this.orders.set(orders);
      this.batches.set(batches);
      this.settings.set(settings);
      this.error.set(null);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load admin data');
    } finally {
      this.loading.set(false);
    }
  }
}
