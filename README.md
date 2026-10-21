# Thanksgiving sample bags

Customers scan a flyer QR code, build a Thanksgiving sample bag, pay the owner (Zelle default) and choose pickup, local delivery or shipping. 100% of profit plus the owner's attributable Amway bonus is donated. Angular + Angular Material on GitHub Pages; Supabase (Postgres, Auth, Edge Functions) behind it. Decisions live in `../wayfinder/SPEC.md` and `../wayfinder/BUILD-PLAN.md`.

## Status
Built and tested locally. Nothing has been pushed, deployed or created in any outside service. Catalog data, prices, weights, tags, ZIP zones, payment handles and the charity name are **placeholders**.

## Run everything (Node 24, see `.nvmrc`)
```bash
nvm use && npm ci
npm start                 # dev server on :4200 using the in-memory MOCK API (storefront + admin, no network)
npm test                  # shared-module and Edge Function tests (vitest), then Angular specs (ng test)
npm run typecheck:functions
npm run build:pages       # production build for GitHub Pages (base href /thanksgiving-bags/, copies index.html to 404.html)
```
Mock mode: `/admin-login` signs in as any email. `?today=2026-11-10` simulates a date for cutoff notices (mock/test builds only; the real server always uses real time). Orders and emails live only in the browser tab (emails are logged to the console).

Real backend: `supabase start`, then `npm run gen:seed` is already applied via `supabase/seed.sql`; set the Supabase URL and anon key in `src/environments/environment.testproject.ts` (test) or `environment.prod.ts` (prod) and run `ng serve -c test`. `ng build -c test|production` swaps in the Supabase `ApiService` (the mock and its seed data, which contains item costs, are not in those bundles).

## Layout
- `supabase/functions/_shared/`: pure TypeScript shared by browser and server (`pricing`, `cart`, `shipping`, `cutoffs`, `zip`, `rollup`, `donation`, `orders`, `emails`, order validation) and the Edge Function cores (`place-order`, `notify`, `maintenance`). Angular imports them via `@shared/*`. Specs sit beside them.
- `supabase/functions/{place-order,notify,expire-unpaid,purge-pii}/index.ts`: thin Deno wrappers.
- `supabase/migrations/`: schema, RLS and views (`public_catalog` has no cost), functions; `supabase/seed.sql` (generated, placeholder); `supabase/optional/cron.sql`.
- `src/app/{shop,admin,totals,learn-more,core}`: storefront (`ThemeTiles`, `ShelfNav`, `ItemCard`, `BagPanel`, `CheckoutForm`, `OrderConfirmation`), lazy-loaded admin, `ApiService` (abstract) with `MockApiService` and `SupabaseApiService`.
- `scripts/`: `gen-seed.ts`, `import-catalog.ts`.

## Behavior notes (decisions made while building)
- Prices, shipping tier and lateness are recomputed on the server; a client total that disagrees is rejected (HTTP 409 `price_changed`). Item cost is never in any browser-visible view or response. The DB also enforces the pricing floor with a CHECK constraint.
- Large order = more than 20 items, or shipping over 8 lb: needs approval; the first email withholds payment steps until you press Approve in Orders.
- 48-hour expiry applies to Placed, non-cash orders that are not awaiting approval. Cash orders pay on collection; use "Confirm cash by text" so they enter the rollup.
- Stock counts are checked at order time but not auto-decremented; mark items Sold out in the Catalog tab (sold-out items disappear from the shop).
- Orders whose name starts with `TEST` are flagged TEST automatically; they are excluded from rollup and donation and can be bulk-deleted.
- Emails: "paid" is sent when you mark an order Paid; "ready" when you mark it Packed (the dialog asks for the window and tracking). Resend options are in the row menu.
- The privacy text says "private database" (the spec said Google Sheet; superseded by the Supabase decision).
- Starter bags live in the `starter_bags` table (seeded). There is no editor for them in the admin; edit in the Supabase table editor. After a catalog import, items that disappear are dropped from a starter with a notice to the shopper.
- Cut line status: nothing was cut. Settings fall back to `DEFAULT_SETTINGS` if the table is empty.

## Catalog import
Fill `../wayfinder/owner-catalog-sheet.csv` (set `Include? = Y` and a Shelf on rows to sell). "YOUR IBO cost", "PV", "BV" and "Est. retail" are per **box** as on the price list; the importer divides by "Units per box" (fill it in; non-Amway rows are per unit). Then either use **Admin → Catalog → Import CSV**, or `npm run import:catalog -- ../wayfinder/owner-catalog-sheet.csv` which writes `supabase/import-catalog.sql` to paste into the Supabase SQL editor. Both verify the pricing floor and hide every item not in the sheet. Imported tags are marked verified: only fill the tag columns after reading the physical label.

## Owner steps still to do (nothing below was done for you)
1. **Charity permission** (hard gate). Until written permission is on file leave Settings → Charity name blank (the site says "a local Des Moines-area soup kitchen (named here when confirmed)"). Print the unnamed flyer if there is none by Oct 28.
2. **Dedicated Gmail** for the owner account and as email reply-to.
3. **GitHub repo** `thanksgiving-bags` under `dieggomyeggo` (private is fine; Pages from a private repo needs a paid plan, otherwise make it public). Push, enable Pages with "GitHub Actions" as the source. Add secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROD_PROJECT_REF`.
4. **Supabase test and prod projects.** For each: `supabase link --project-ref <ref>`, `supabase db push`, run `supabase/seed.sql` (placeholder) or the catalog import, `supabase functions deploy place-order notify expire-unpaid purge-pii`, `supabase secrets set --env-file supabase/functions/.env` (copy `.env.example`). Then insert your Gmail: `insert into public.admins (email) values ('you@gmail.com');`. In Auth settings add the Pages URL (`https://dieggomyeggo.github.io/thanksgiving-bags/admin`) to redirect URLs, and set the Site URL. Paste each project's URL and anon key into `src/environments/environment.testproject.ts` / `environment.prod.ts` (the anon key is public by design; never use the service-role key there). Optionally `supabase gen types typescript` after linking.
5. **Domain + Resend:** buy a cheap domain, verify it in Resend (SPF/DKIM, can take hours; start first), create the API key, set `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO`. Until then emails are only logged by the function.
6. **Expiry schedule:** enable `pg_cron` and run `supabase/optional/cron.sql` on each project (or press "Expire unpaid now" in the admin).
7. **Fill in real data:** catalog sheet (costs, PV/BV, weights, stock, label-checked tags) by Oct 25; Settings tab (payment handles, contact, ZIP lists near/far, "Learn more" URL, pickup note); verify prices against the price list and Business Center; real USPS/Pirate Ship rates for the 2/4/8 lb tiers.
8. **Tests on the real stack (SPEC §12):** Playwright or manual runs against the test project: every fulfillment and payment option, minimum, large order, distance rules, over-8 lb quote, post-cutoff notice, 48-hour expiry, sold-out, honeypot, email deliverability to Gmail and Outlook, QR scan on iPhone and Android, anon-key checks (cannot read `orders`, `order_items` or cost; cannot insert orders). Delete TEST orders before launch.
9. Dec: after the November bonus, enter total November BV and bonus in Settings → Donation calculator, publish totals, then Purge personal data by Dec 31. Amway Rule 4.22 and sales tax remain accepted risks, not handled here.
