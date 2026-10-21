-- Row level security, public views, and admin helper. The browser holds only the anon key.

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

alter table public.admins enable row level security;
alter table public.items enable row level security;
alter table public.starter_bags enable row level security;
alter table public.settings enable row level security;
alter table public.zips enable row level security;
alter table public.batches enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Start from nothing, then grant narrowly.
revoke all on all tables in schema public from anon, authenticated;

-- Admins (authenticated + listed in public.admins): full access. Anon: nothing on these tables.
create policy admins_self on public.admins for select to authenticated using (public.is_admin());
create policy items_admin on public.items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy starter_admin on public.starter_bags for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy settings_admin on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy zips_admin on public.zips for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy batches_admin on public.batches for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy orders_admin on public.orders for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy order_items_admin on public.order_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.admins to authenticated;
grant select, insert, update, delete on public.items, public.starter_bags, public.settings, public.zips,
  public.batches, public.orders, public.order_items to authenticated;

-- Public starter bags and ZIP allowlist: readable by anyone (no sensitive columns).
create policy starter_public on public.starter_bags for select to anon, authenticated using (active);
create policy zips_public on public.zips for select to anon, authenticated using (true);
grant select on public.starter_bags, public.zips to anon;

-- Public catalog: active, available items only; never cost, retail, PV/BV or stock counts.
-- Views run with the owner's rights, so anon needs no access to public.items itself.
create view public.public_catalog as
select
  id,
  shelf,
  name,
  kind,
  unit_price_cents,
  weight_lb,
  case when tags_verified then tags else '{}'::jsonb end as tags,
  tags_verified,
  sort
from public.items
where active and not sold_out and (stock is null or stock > 0);

-- Public settings: only keys that are safe to publish.
create view public.public_settings as
select key, value
from public.settings
where key in (
  'cutoffShip', 'cutoffLocal', 'orderingCloses', 'shipTiers', 'farDeliveryCents', 'packagingLb',
  'minItems', 'largeOrderItems', 'unpaidExpiryHours', 'charityName', 'ownerFirstName',
  'contactEmail', 'contactPhone', 'payments', 'learnMoreUrl', 'pickupNote', 'totals'
);

grant select on public.public_catalog, public.public_settings to anon, authenticated;
