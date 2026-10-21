// Static guards over the SQL: the anon role must never reach orders or item cost. (Run the SPEC security checks
// against the real test project too; these catch accidental edits to the migrations.)
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dir = new URL('../../migrations/', import.meta.url);
const sql = readdirSync(dir).sort().map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n');

describe('migrations', () => {
  it('enables RLS on every table', () => {
    const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]);
    expect(tables.length).toBeGreaterThan(6);
    for (const t of tables) expect(sql, t).toMatch(new RegExp(`alter table public\\.${t} enable row level security`));
  });
  it('public_catalog exposes no cost, retail, pv, bv or stock', () => {
    const view = /create view public\.public_catalog as([\s\S]*?);/.exec(sql)![1];
    expect(view).not.toMatch(/cost_cents|retail_cents|\bpv\b|\bbv\b|\bstock\b\s*,/);
    expect(view).toMatch(/where active and not sold_out/);
  });
  it('anon is granted only the public views, starter bags and zips', () => {
    const grants = [...sql.matchAll(/grant [^;]*to anon[^;]*;/g)].map((m) => m[0]);
    for (const g of grants) expect(g).not.toMatch(/public\.(orders|order_items|items|settings|admins|batches)\b/);
    expect(sql).toMatch(/revoke all on all tables in schema public from anon, authenticated/);
  });
  it('place_order is callable only by the service role', () => {
    expect(sql).toMatch(/revoke all on function public\.place_order\(jsonb, jsonb\) from public, anon, authenticated/);
    expect(sql).toMatch(/grant execute on function public\.place_order\(jsonb, jsonb\) to service_role/);
  });
  it('the database enforces the pricing floor', () => {
    expect(sql).toMatch(/items_pricing_floor/);
    expect(sql).toMatch(/unit_price_cents \* 97 >= 100 \* cost_cents \+ greatest\(25 \* cost_cents, 5000\)/);
  });
});
