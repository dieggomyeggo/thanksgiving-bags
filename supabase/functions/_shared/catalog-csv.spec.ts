import { describe, expect, it } from 'vitest';
import { catalogFromCsv, parseCsv, slug } from './catalog-csv.ts';
import { floorOk } from './pricing.ts';

const HEAD = 'Type,Item,"Est. retail (research, UNVERIFIED)",Units per box,Est. IBO (retail -20%),Research notes/tags,YOUR IBO cost,PV,BV,Shipping weight,In stock? (Y/N),Caffeine mg,Sugar-free,Organic,Vegan,NSF type,Allergens incl. nuts,Individually wrapped? (Y/N),Include? (Y/N),Shelf';

describe('parseCsv', () => {
  it('handles quotes, commas, escaped quotes and CRLF', () => {
    expect(parseCsv('a,"b,c","d ""q"""\r\n1,2,3\r\n')).toEqual([['a', 'b,c', 'd "q"'], ['1', '2', '3']]);
  });
});

describe('catalogFromCsv', () => {
  it('imports included rows, divides box figures by units per box, computes price and keeps the floor', () => {
    const csv = [HEAD,
      'Amway,"XS Energy 12 oz can","$37.00",12,,,$29.60,36,30,5.5,Y,114,Y,,,,,Y,Y,Energy & Fitness',
      'Non-Amway,Honey stick,,,,,$0.20,,,0.05,Y,,,,,,,Y,Y,Pantry & Treats',
      'Amway,Skipped item,$10,1,,,$8,,,1,Y,,,,,,,Y,N,Personal Care'].join('\n');
    const r = catalogFromCsv(csv);
    expect(r.items.map((i) => i.id)).toEqual(['xs-energy-12-oz-can', 'honey-stick']);
    const can = r.items[0];
    expect(can).toMatchObject({ costCents: 247, retailCents: 308, boxSize: 12, shelf: 'Energy & Fitness', tags: { caffeineMg: 114, sugarFree: true }, tagsVerified: true });
    expect(can.bv).toBeCloseTo(2.5);
    expect(can.unitPriceCents).toBe(325);
    for (const i of r.items) expect(floorOk(i.costCents, i.unitPriceCents)).toBe(true);
    expect(r.items[1]).toMatchObject({ kind: 'other', unitPriceCents: 75 });
  });
  it('warns and skips rows missing cost or shelf; marks N stock as sold out', () => {
    const csv = [HEAD,
      'Amway,No cost,$5,1,,,,,,1,Y,,,,,,,Y,Y,Personal Care',
      'Amway,No shelf,$5,1,,,$4,,,1,Y,,,,,,,Y,Y,',
      'Amway,Out,$5,1,,,$4,,,1,N,,,,,,,Y,Y,Personal Care'].join('\n');
    const r = catalogFromCsv(csv);
    expect(r.items.map((i) => i.name)).toEqual(['Out']);
    expect(r.items[0].soldOut).toBe(true);
    expect(r.warnings.join('|')).toMatch(/no "YOUR IBO cost"/);
    expect(r.warnings.join('|')).toMatch(/no shelf/);
  });
  it('reports missing columns', () => {
    expect(catalogFromCsv('a,b\n1,2').warnings[0]).toMatch(/missing columns/);
  });
  it('the real template (all Include blank) imports nothing', async () => {
    const { readFileSync, existsSync } = await import('node:fs');
    const p = new URL('../../../../wayfinder/owner-catalog-sheet.csv', import.meta.url);
    if (!existsSync(p)) return;
    expect(catalogFromCsv(readFileSync(p, 'utf8')).items).toEqual([]);
  });
  it('slug', () => expect(slug('XS Energy (12 oz) & more!')).toBe('xs-energy-and-more'));
});
