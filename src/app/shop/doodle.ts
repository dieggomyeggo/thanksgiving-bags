import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type DoodleKind = 'pumpkin' | 'leaf' | 'wheat' | 'acorn' | 'dumbbell' | 'bolt' | 'sparkle' | 'pie' | 'gift';

/** Original hand-drawn style illustrations (drawn for this site, no third-party clipart). Fixed warm colors read on light and dark. */
@Component({
  selector: 'app-doodle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[style.width.px]': 'size()', '[style.height.px]': 'size()', '[style.transform]': 'transform()' },
  template: `
    <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" stroke-linecap="round" stroke-linejoin="round" focusable="false">
      @switch (kind()) {
        @case ('pumpkin') {
          <ellipse cx="32" cy="39" rx="27" ry="20" fill="#d9701f" />
          <ellipse cx="19" cy="39" rx="12" ry="19" fill="#ea8a35" />
          <ellipse cx="45" cy="39" rx="12" ry="19" fill="#ea8a35" />
          <ellipse cx="32" cy="39" rx="9" ry="20" fill="#f6a050" />
          <ellipse cx="32" cy="39" rx="27" ry="20" stroke="#a8500f" stroke-width="1.6" />
          <path d="M23 21c-3 5-4 12-4 18M41 21c3 5 4 12 4 18" stroke="#a8500f" stroke-width="1.2" opacity=".55" />
          <path d="M29 20c0-6 2-9 6-11l3 3c-3 2-4 5-4 8z" fill="#6b4a2b" stroke="#4d3320" stroke-width="1.2" />
          <path d="M37 17c7-7 16-6 19 0-7 6-14 5-19 0z" fill="#6f9a45" stroke="#4d7330" stroke-width="1.2" />
          <path d="M36 12c3-4 8-5 11-3" stroke="#6f9a45" stroke-width="2" />
        }
        @case ('leaf') {
          <path d="M32 4c17 11 21 31 0 56C11 35 15 15 32 4z" fill="currentColor" stroke="#0004" stroke-width="1.4" />
          <path d="M32 12v50M32 28l-9-8M32 28l9-8M32 41l-8-7M32 41l8-7" stroke="#0004" stroke-width="1.5" />
        }
        @case ('wheat') {
          <path d="M32 62V22" stroke="#a97b24" stroke-width="2.4" />
          <g fill="#e0ac3a" stroke="#a97b24" stroke-width="1.2">
            <ellipse cx="32" cy="12" rx="3.4" ry="7" />
            <ellipse cx="25" cy="22" rx="3.2" ry="6.5" transform="rotate(-32 25 22)" />
            <ellipse cx="39" cy="22" rx="3.2" ry="6.5" transform="rotate(32 39 22)" />
            <ellipse cx="25" cy="33" rx="3.2" ry="6.5" transform="rotate(-32 25 33)" />
            <ellipse cx="39" cy="33" rx="3.2" ry="6.5" transform="rotate(32 39 33)" />
            <ellipse cx="26" cy="44" rx="3" ry="6" transform="rotate(-30 26 44)" />
            <ellipse cx="38" cy="44" rx="3" ry="6" transform="rotate(30 38 44)" />
          </g>
        }
        @case ('acorn') {
          <path d="M18 30c0 18 7 28 14 30 7-2 14-12 14-30z" fill="#c98a3d" stroke="#8a5a1e" stroke-width="1.6" />
          <path d="M14 30c0-10 8-16 18-16s18 6 18 16z" fill="#8a5a2b" stroke="#5e3b17" stroke-width="1.6" />
          <path d="M22 24l4 4M32 20l4 4M40 24l4 4M26 22l-2 3M38 22l-2 3" stroke="#5e3b17" stroke-width="1.2" />
          <path d="M32 14V8" stroke="#5e3b17" stroke-width="2.4" />
        }
        @case ('dumbbell') {
          <g fill="currentColor" stroke="#0005" stroke-width="1.4">
            <rect x="4" y="22" width="9" height="20" rx="3" />
            <rect x="13" y="26" width="6" height="12" rx="2" />
            <rect x="45" y="26" width="6" height="12" rx="2" />
            <rect x="51" y="22" width="9" height="20" rx="3" />
            <rect x="19" y="30" width="26" height="4" rx="2" />
          </g>
        }
        @case ('bolt') {
          <path d="M37 4 14 36h14l-4 24 26-34H36z" fill="currentColor" stroke="#0005" stroke-width="1.6" />
        }
        @case ('sparkle') {
          <path d="M26 6c2 12 6 16 18 18-12 2-16 6-18 18-2-12-6-16-18-18 12-2 16-6 18-18z" fill="currentColor" stroke="#0005" stroke-width="1.4" />
          <path d="M48 36c1 6 3 8 9 9-6 1-8 3-9 9-1-6-3-8-9-9 6-1 8-3 9-9z" fill="currentColor" stroke="#0005" stroke-width="1.2" />
        }
        @case ('pie') {
          <path d="M6 34h52c0 14-11 24-26 24S6 48 6 34z" fill="#d9a35a" stroke="#9a6a28" stroke-width="1.6" />
          <path d="M10 34c0-10 10-18 22-18s22 8 22 18z" fill="#e8873a" stroke="#a8500f" stroke-width="1.6" />
          <path d="M20 40l3 14M32 42v15M44 40l-3 14" stroke="#9a6a28" stroke-width="1.4" />
          <circle cx="32" cy="25" r="3" fill="#fff3dc" opacity=".8" />
        }
        @default {
          <rect x="8" y="26" width="48" height="32" rx="4" fill="currentColor" stroke="#0005" stroke-width="1.6" />
          <rect x="5" y="18" width="54" height="12" rx="3" fill="currentColor" stroke="#0005" stroke-width="1.6" />
          <path d="M32 18v40" stroke="#fff6" stroke-width="5" />
          <path d="M32 18c-8-12-18-8-14-3s14 3 14 3zm0 0c8-12 18-8 14-3s-14 3-14 3z" stroke="#0005" stroke-width="1.6" fill="#fff6" />
        }
      }
    </svg>
  `,
  styles: `
    :host { display: inline-block; flex: none; }
    svg { display: block; overflow: visible; }
  `,
})
export class Doodle {
  readonly kind = input.required<DoodleKind>();
  readonly size = input(48);
  readonly rotate = input(0);
  protected transform = () => (this.rotate() ? `rotate(${this.rotate()}deg)` : null);
}
