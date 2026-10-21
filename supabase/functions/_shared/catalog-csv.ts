// Parses the owner's catalog sheet (wayfinder/owner-catalog-sheet.csv) into ItemRows.
// Used by `npm run import:catalog` and by the admin "Import CSV" button, so both behave identically.
//
// Conventions (also in README): "YOUR IBO cost", "PV", "BV" and "Est. retail" are PER BOX as on the price list;
// they are divided by "Units per box" (column 4, owner fills it in). Non-Amway rows are per unit.
import { SHELVES } from './shelves.ts';
import { unitPriceCents } from './pricing.ts';
import type { ItemRow, ItemTags } from './types.ts';

/** RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  const t = text.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

const money = (s: string | undefined): number | null => {
  const m = /\$?\s*(\d+(?:\.\d+)?)/.exec((s ?? '').replace(/,/g, ''));
  return m ? Math.round(parseFloat(m[1]) * 100) : null;
};
const num = (s: string | undefined): number | null => {
  const m = /(\d+(?:\.\d+)?)/.exec(s ?? '');
  return m ? parseFloat(m[1]) : null;
};
const yes = (s: string | undefined) => /^\s*y/i.test(s ?? '');
const filled = (s: string | undefined) => (s ?? '').trim() !== '';

export const slug = (s: string) =>
  s.toLowerCase().replace(/\(.*?\)/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);

export interface CatalogImport {
  items: ItemRow[];
  warnings: string[];
}

export function catalogFromCsv(text: string): CatalogImport {
  const [header, ...rows] = parseCsv(text);
  if (!header) return { items: [], warnings: ['empty file'] };
  const col = (needle: string) => header.findIndex((h) => h.toLowerCase().replace(/\s+/g, ' ').includes(needle));
  const idx = {
    type: col('type'), item: col('item'), retail: col('est. retail'), box: col('units per box'), cost: col('your ibo cost'),
    pv: col('pv'), bv: col('bv'), weight: col('shipping weight'), stock: col('in stock'), caf: col('caffeine'),
    sf: col('sugar-free'), org: col('organic'), vegan: col('vegan'), nsf: col('nsf'), allergens: col('allergens'),
    wrapped: col('individually wrapped'), include: col('include'), shelf: col('shelf'),
  };
  const missing = Object.entries(idx).filter(([, v]) => v < 0).map(([k]) => k);
  if (missing.length) return { items: [], warnings: [`missing columns: ${missing.join(', ')}`] };

  const items: ItemRow[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  rows.forEach((r, n) => {
    if (!yes(r[idx.include])) return;
    const name = (r[idx.item] ?? '').trim();
    const where = `row ${n + 2} (${name})`;
    const kind = /^amway/i.test(r[idx.type] ?? '') ? 'amway' : 'other';
    const boxSize = kind === 'amway' ? Math.max(1, Math.round(num(r[idx.box]) ?? 0)) : 1;
    if (kind === 'amway' && !num(r[idx.box])) warnings.push(`${where}: "Units per box" blank, assuming 1`);
    const costBox = money(r[idx.cost]);
    if (costBox === null) { warnings.push(`${where}: no "YOUR IBO cost", skipped`); return; }
    const costCents = Math.round(costBox / boxSize);
    const retailBox = money(r[idx.retail]);
    const retailCents = retailBox === null ? null : Math.round(retailBox / boxSize);
    const shelfRaw = (r[idx.shelf] ?? '').trim();
    const shelf = SHELVES.find((s) => s.toLowerCase() === shelfRaw.toLowerCase()) ?? shelfRaw;
    if (!shelf) { warnings.push(`${where}: no shelf, skipped`); return; }
    const weightLb = num(r[idx.weight]);
    if (weightLb === null) warnings.push(`${where}: no weight, assuming 0.2 lb`);
    const tags: ItemTags = {};
    if (filled(r[idx.caf])) tags.caffeineMg = num(r[idx.caf]);
    if (yes(r[idx.sf])) tags.sugarFree = true;
    if (yes(r[idx.org])) tags.organic = true;
    if (yes(r[idx.vegan])) tags.vegan = true;
    if (filled(r[idx.nsf])) tags.nsf = r[idx.nsf].trim();
    if (filled(r[idx.allergens]) && !/^none$/i.test(r[idx.allergens].trim())) tags.allergens = r[idx.allergens].split(/[;,]/).map((x) => x.trim()).filter(Boolean);
    let id = slug(name);
    if (seen.has(id)) id = `${id}-${n}`;
    seen.add(id);
    const pvBox = num(r[idx.pv]);
    const bvBox = num(r[idx.bv]);
    items.push({
      id, shelf, name, kind, costCents, retailCents,
      pv: pvBox === null ? null : +(pvBox / boxSize).toFixed(2), bv: bvBox === null ? null : +(bvBox / boxSize).toFixed(2),
      weightLb: weightLb ?? 0.2, boxSize, tags, tagsVerified: true,
      individuallyWrapped: !filled(r[idx.wrapped]) || yes(r[idx.wrapped]),
      stock: null, soldOut: filled(r[idx.stock]) && !yes(r[idx.stock]), active: true, sort: (items.length + 1) * 10,
      unitPriceCents: unitPriceCents(costCents, retailCents),
    });
  });
  return { items, warnings };
}
