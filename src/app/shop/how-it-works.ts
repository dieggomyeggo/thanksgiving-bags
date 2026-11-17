import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Answers the first questions shoppers ask: what do I get, where does it come from, and where does the money go. */
@Component({
  selector: 'app-how-it-works',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="how" aria-labelledby="how-h">
      <h2 id="how-h">How it works</h2>
      <ol>
        <li>
          <b>You pick the products</b>
          <span>Build a sampler bag of at least {{ minItems() }} Amway products to try, enjoy or give as a gift: energy drinks, hydration mixes, home and personal care. Choose your flavors, see photos and the full product listings.</span>
        </li>
        <li>
          <b>I pack it and get it to you</b>
          <span>Every bag is packed by me with free gifts and a handwritten thank-you, then delivered locally, held for pickup in Johnston, or shipped.</span>
        </li>
        <li>
          <b>The profit becomes a donation</b>
          <span>Every dollar of my profit, plus the bonus I earn from your order, is donated to {{ charity() }} as <b>money</b>. The bag is yours to keep; the products themselves don't go to the shelter.</span>
        </li>
      </ol>
    </section>
  `,
  styles: `
    .how { margin: 14px 0 6px; padding: 16px 18px; border-radius: 16px; background: var(--mat-sys-surface-container); border: 1px solid var(--mat-sys-outline-variant); }
    h2 { margin: 0 0 10px; font-size: 1.15rem; }
    ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; counter-reset: step; }
    li { counter-increment: step; display: flex; flex-direction: column; gap: 4px; padding-left: 40px; position: relative; font-size: 14px; line-height: 1.4; }
    li::before { content: counter(step); position: absolute; left: 0; top: 0; width: 28px; height: 28px; border-radius: 50%; background: var(--mat-sys-primary); color: var(--mat-sys-on-primary); display: grid; place-items: center; font-weight: 700; font-size: 14px; }
    li > b { font-size: 15px; }
    li span { color: var(--mat-sys-on-surface-variant); }
    @media (max-width: 800px) { ol { grid-template-columns: 1fr; } }
  `,
})
export class HowItWorks {
  readonly charity = input.required<string>();
  readonly minItems = input(3);
}
