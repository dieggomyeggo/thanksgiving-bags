import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Doodle } from './doodle';

/** Warm header band: title, one-line promise, and an autumn leaf garland. */
@Component({
  selector: 'app-hero',
  imports: [Doodle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="hero">
      <div class="copy">
        <p class="eyebrow">Johnston, Iowa · Thanksgiving 2026</p>
        <h1>Thanksgiving Sample Bags</h1>
        <p class="lede">Build a cozy little bag for your table, a neighbor or yourself. Every dollar of profit goes to a local food charity, and each bag comes with free gifts and a handwritten thank-you.</p>
      </div>
      <div class="art" aria-hidden="true">
        <app-doodle kind="wheat" [size]="74" [rotate]="-14" class="wheat" />
        <app-doodle kind="pumpkin" [size]="112" />
        <app-doodle kind="acorn" [size]="46" [rotate]="10" class="acorn" />
        <app-doodle kind="leaf" [size]="52" [rotate]="24" style="color:#c2501f" class="l1" />
        <app-doodle kind="leaf" [size]="40" [rotate]="-30" style="color:#e0a030" class="l2" />
      </div>
      <div class="garland" aria-hidden="true">
        @for (c of leaves; track $index) {
          <app-doodle kind="leaf" [size]="22" [rotate]="c.r" [style.color]="c.c" />
        }
      </div>
    </header>
  `,
  styles: `
    .hero {
      position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 26px 28px 40px; border-radius: 22px; margin-bottom: 8px;
      background:
        radial-gradient(circle at 92% 20%, light-dark(#ffd9a8, #5b3414) 0, transparent 48%),
        linear-gradient(135deg, var(--mat-sys-primary-container), var(--mat-sys-surface-container-high));
      color: var(--mat-sys-on-primary-container);
    }
    .copy { min-width: 0; max-width: 620px; }
    .eyebrow { margin: 0 0 4px; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; font-weight: 600; opacity: .8; }
    h1 { font-family: 'Iowan Old Style', 'Palatino Linotype', Georgia, serif; font-size: clamp(1.8rem, 5vw, 2.8rem); line-height: 1.1; margin: 0 0 10px; font-weight: 700; text-wrap: balance; }
    .lede { margin: 0; max-width: 56ch; font-size: 1.02rem; }
    .art { position: relative; flex: none; width: 190px; height: 130px; }
    .art app-doodle { position: absolute; }
    .art app-doodle:nth-child(2) { left: 52px; top: 12px; }
    .wheat { left: 6px; top: 40px; }
    .acorn { left: 150px; top: 78px; }
    .l1 { left: 128px; top: -6px; }
    .l2 { left: 22px; top: -4px; }
    .garland { position: absolute; left: 0; right: 0; bottom: 6px; display: flex; justify-content: space-around; opacity: .9; pointer-events: none; }
    @media (max-width: 640px) {
      .hero { padding: 20px 18px 38px; }
      .art { display: none; }
    }
  `,
})
export class Hero {
  protected readonly leaves = Array.from({ length: 16 }, (_, i) => ({
    r: ((i * 53) % 90) - 45,
    c: ['#c2501f', '#e0a030', '#a8421a', '#d98a2b', '#8a6a2a'][i % 5],
  }));
}
