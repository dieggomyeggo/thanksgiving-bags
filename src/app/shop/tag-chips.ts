import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatChipSet, MatChip } from '@angular/material/chips';
import type { ItemTags } from '@shared/types';

@Component({
  selector: 'app-tag-chips',
  imports: [MatChipSet, MatChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (chips().length) {
      <mat-chip-set aria-label="Item details">
        @for (c of chips(); track c.text) {
          <mat-chip [class.caf]="c.kind === 'caf'" [class.allergen]="c.kind === 'allergen'" disableRipple>{{ c.text }}</mat-chip>
        }
      </mat-chip-set>
    }
  `,
  styles: `
    mat-chip { --mdc-chip-container-height: 24px; --mat-chip-container-height: 24px; font-size: 12px; }
    .caf { --mat-chip-label-text-color: light-dark(#8a5a00, #f0c068); }
    .allergen { --mat-chip-label-text-color: light-dark(#a02a22, #f2a59f); }
  `,
})
export class TagChips {
  readonly tags = input.required<ItemTags>();
  protected readonly chips = computed(() => {
    const t = this.tags();
    const out: { text: string; kind: 'caf' | 'allergen' | 'plain' }[] = [];
    if (t.caffeineMg === 0) out.push({ text: 'caffeine-free', kind: 'plain' });
    else if (t.caffeineMg) out.push({ text: `caffeine ${t.caffeineMg} mg`, kind: 'caf' });
    if (t.sugarFree) out.push({ text: 'sugar-free', kind: 'plain' });
    if (t.organic) out.push({ text: 'organic', kind: 'plain' });
    if (t.vegan) out.push({ text: 'vegan', kind: 'plain' });
    if (t.nsf) out.push({ text: `NSF ${t.nsf}`, kind: 'plain' });
    for (const a of t.allergens ?? []) out.push({ text: a, kind: 'allergen' });
    return out;
  });
}
