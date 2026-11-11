import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatBadge } from '@angular/material/badge';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { prettyDate } from '@shared/cutoffs';
import { charityLabel } from '@shared/settings';
import type { StarterBag } from '@shared/types';
import { money } from '../core/format';
import { BagPanel } from './bag-panel';
import { BagStore } from './bag.store';
import { Hero } from './hero';
import { ItemCard } from './item-card';
import { NoticeDialog } from './notice-dialog';
import { OrderConfirmation } from './order-confirmation';
import { ShelfNav } from './shelf-nav';
import { ThemeTiles } from './theme-tiles';

@Component({
  selector: 'app-shop-page',
  imports: [RouterLink, MatButton, MatBadge, MatProgressSpinner, Hero, ThemeTiles, ShelfNav, ItemCard, BagPanel, OrderConfirmation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (s.confirmation()) {
      <app-order-confirmation (done)="s.reset()" />
    } @else {
      <div class="wrap">
        <app-hero />
        <div class="notice banner">
          <b>Order any time through {{ pd(s.settings().orderingCloses) }}.</b> To arrive before Thanksgiving, order shipping by {{ pd(s.settings().cutoffShip) }} or local delivery/pickup by {{ pd(s.settings().cutoffLocal) }}. Orders placed after that still go through, but they will arrive after Thanksgiving.
          100% of my profit from these bags, plus the Amway bonus I earn from them, goes to {{ charity() }}.
        </div>
        <h2 class="build">Build your bag</h2>
        <p class="muted">Pick at least {{ s.settings().minItems }} items. Every bag includes a free handwritten thank-you card.</p>

        @if (s.loading()) {
          <mat-spinner diameter="36" aria-label="Loading" />
        } @else if (s.loadError()) {
          <div class="notice err" role="alert">Couldn't load the catalog: {{ s.loadError() }} <button mat-button (click)="s.load()">Try again</button></div>
        } @else {
          <div class="layout">
            <div class="left"><app-shelf-nav [shelves]="s.shelves()" [active]="shelf()" (select)="shelf.set($event)" /></div>
            <div class="center">
              <app-theme-tiles [starters]="s.starters()" (pick)="pickStarter($event)" (scratch)="scratch()" />
              <h2>{{ shelf() }}</h2>
              <div class="grid">
                @for (i of shelfItems(); track i.id) {
                  <app-item-card [item]="i" [lines]="s.lines()" (inc)="s.inc($event)" (dec)="s.dec($event)" />
                } @empty {
                  <p class="muted">Nothing on this shelf right now.</p>
                }
              </div>
              <p class="muted disclaimer">Items may contain caffeine and allergens (milk, soy, tree nuts, peanuts); check each item's tags. Not medical advice. Every bag includes a handwritten thank-you card.</p>
              <p><a routerLink="/learn-more">Learn more / bigger orders</a></p>
            </div>
            <div class="right"><app-bag-panel (place)="place()" /></div>
          </div>
          <a class="mobile-bar" href="#bag" aria-label="Go to your bag">
            <span [matBadge]="s.count()" matBadgeSize="small" [matBadgeHidden]="s.count() === 0">Your bag</span>
            <b>{{ m(s.total()) }}</b>
          </a>
        }
      </div>
    }
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 180px 1fr 340px; gap: 18px; align-items: start; }
    .right { position: sticky; top: 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; }
    .disclaimer { font-size: 12px; }
    .mobile-bar { display: none; }
    @media (max-width: 960px) {
      .layout { grid-template-columns: 1fr; }
      .right { position: static; }
      .mobile-bar {
        display: flex; justify-content: space-between; align-items: center; position: fixed; left: 12px; right: 12px; bottom: 12px;
        padding: 12px 18px; border-radius: 28px; background: var(--mat-sys-primary); color: var(--mat-sys-on-primary);
        text-decoration: none; box-shadow: 0 4px 16px #0005; z-index: 5;
      }
      .wrap { padding-bottom: 84px; }
    }
  `,
})
export class ShopPage {
  protected readonly s = inject(BagStore);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  protected readonly pd = prettyDate;
  protected readonly m = money;
  protected readonly charity = computed(() => charityLabel(this.s.settings()));
  protected readonly shelf = signal('');
  private readonly activeShelf = computed(() => this.shelf() || this.s.shelves()[0] || '');
  protected readonly shelfItems = computed(() => this.s.catalog().filter((i) => i.shelf === this.activeShelf()).sort((a, b) => a.sort - b.sort));

  constructor() {
    void this.s.load().then(() => this.shelf.set(this.s.shelves()[0] ?? ''));
  }

  protected pickStarter(st: StarterBag): void {
    const missing = this.s.applyStarter(st);
    if (missing.length) {
      this.dialog.open(NoticeDialog, { data: { title: 'Some items are unavailable', body: `${missing.length} item(s) in "${st.name}" are sold out right now, so they were left out. You can add something else from the shelves.` } });
    } else {
      this.snack.open(`"${st.name}" loaded. Change anything you like.`, 'OK', { duration: 3000 });
    }
    document.getElementById('bag')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  protected scratch(): void {
    this.s.clear();
    this.snack.open('Starting empty. Add items from the shelves.', 'OK', { duration: 2500 });
  }

  protected async place(): Promise<void> {
    if (this.s.large()) {
      const ok = await new Promise<boolean>((resolve) =>
        this.dialog.open(NoticeDialog, {
          data: { title: 'Large order', body: "That's a big bag! I'll confirm availability and shipping with you before you pay, so please don't send payment until you hear from me.", confirmLabel: 'Place order', cancelLabel: 'Keep editing' },
        }).afterClosed().subscribe((v) => resolve(v === true)),
      );
      if (!ok) return;
    }
    const r = await this.s.place();
    if (!r.ok && r.error !== 'busy') this.snack.open('Order not placed. See the message above the button.', 'OK', { duration: 4000 });
  }
}
