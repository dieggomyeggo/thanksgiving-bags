import type { ItemKind, OrderStatus, PayMethod } from './types.ts';

export interface RollupOrder {
  status: OrderStatus;
  payMethod: PayMethod;
  cashConfirmed: boolean;
  test: boolean;
  lines: { itemId: string; qty: number; flavor?: string }[];
}

export interface RollupItem {
  id: string;
  name: string;
  kind: ItemKind;
  boxSize: number;
  costCents: number;
}

export interface RollupRow {
  itemId: string;
  flavor: string;
  name: string;
  kind: ItemKind;
  units: number;
  boxSize: number;
  boxes: number;
  leftover: number;
  estCostCents: number;
}

export interface Rollup {
  rows: RollupRow[];
  amwayCostCents: number;
  text: string;
}

/** Orders that belong in the next Amway batch: Paid, or cash orders the owner has confirmed. Never test orders. */
export function inRollup(o: RollupOrder): boolean {
  if (o.test) return false;
  if (o.status === 'paid') return true;
  return o.status === 'placed' && o.payMethod === 'cash' && o.cashConfirmed;
}

export function buildRollup(orders: RollupOrder[], items: RollupItem[]): Rollup {
  const by = new Map(items.map((i) => [i.id, i]));
  const units = new Map<string, number>();
  for (const o of orders) {
    if (!inRollup(o)) continue;
    for (const l of o.lines) { const k = `${l.itemId}\u0000${l.flavor ?? ''}`; units.set(k, (units.get(k) ?? 0) + l.qty); }
  }
  const rows: RollupRow[] = [];
  for (const [vk, n] of units) {
    const [itemId, flavor = ''] = vk.split('\u0000');
    const it = by.get(itemId);
    if (!it) continue;
    const amway = it.kind === 'amway';
    const boxSize = amway ? Math.max(1, it.boxSize) : 1;
    const boxes = Math.ceil(n / boxSize);
    rows.push({
      itemId,
      flavor,
      name: flavor ? `${it.name} - ${flavor}` : it.name,
      kind: it.kind,
      units: n,
      boxSize,
      boxes,
      leftover: boxes * boxSize - n,
      estCostCents: boxes * boxSize * it.costCents,
    });
  }
  rows.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'amway' ? -1 : 1));
  const amwayCostCents = rows.filter((r) => r.kind === 'amway').reduce((a, r) => a + r.estCostCents, 0);
  return { rows, amwayCostCents, text: renderText(rows, amwayCostCents) };
}

function renderText(rows: RollupRow[], amwayCostCents: number): string {
  const amway = rows.filter((r) => r.kind === 'amway');
  const other = rows.filter((r) => r.kind === 'other');
  const out: string[] = [];
  if (amway.length) {
    out.push('AMWAY ORDER (whole boxes)');
    for (const r of amway) out.push(`${r.boxes} box(es) x ${r.boxSize}  ${r.name}   [${r.units} sold, ${r.leftover} left over]`);
    out.push(`Estimated cost: $${(amwayCostCents / 100).toFixed(2)}`);
  }
  if (other.length) {
    if (out.length) out.push('');
    out.push('BUY ELSEWHERE');
    for (const r of other) out.push(`${r.units} x ${r.name}`);
  }
  return out.join('\n');
}

export function rollupCsv(r: Rollup): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const head = 'item,kind,units,box_size,boxes,leftover,est_cost';
  const body = r.rows.map((x) => [q(x.name), x.kind, x.units, x.boxSize, x.boxes, x.leftover, (x.estCostCents / 100).toFixed(2)].join(','));
  return [head, ...body].join('\n');
}
