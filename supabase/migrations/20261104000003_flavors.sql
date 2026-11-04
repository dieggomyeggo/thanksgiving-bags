-- Flavors: items can offer flavor choices; each order line records the flavor picked.
alter table public.items add column flavors jsonb not null default '[]'::jsonb;
alter table public.order_items add column flavor text not null default '';
alter table public.order_items drop constraint order_items_pkey;
alter table public.order_items add primary key (order_id, item_id, free, flavor);

create or replace function public.place_order(o jsonb, lines jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  new_id uuid;
begin
  insert into public.orders (
    number, status, method, zone, name, email, phone, address, zip, pay_method,
    subtotal_cents, shipping_cents, total_cents, shipping_quote_needed, late, needs_approval,
    opt_followup, opt_shoutout, notes, test, client_hash
  ) values (
    o ->> 'number', 'placed', o ->> 'method', nullif(o ->> 'zone', ''), o ->> 'name', o ->> 'email',
    nullif(o ->> 'phone', ''), nullif(o ->> 'address', ''), nullif(o ->> 'zip', ''), o ->> 'pay_method',
    (o ->> 'subtotal_cents')::int, (o ->> 'shipping_cents')::int, (o ->> 'total_cents')::int,
    (o ->> 'shipping_quote_needed')::boolean, (o ->> 'late')::boolean, (o ->> 'needs_approval')::boolean,
    (o ->> 'opt_followup')::boolean, (o ->> 'opt_shoutout')::boolean, nullif(o ->> 'notes', ''),
    (o ->> 'test')::boolean, o ->> 'client_hash'
  ) returning id into new_id;

  insert into public.order_items (order_id, item_id, qty, unit_price_cents, unit_cost_cents, free, flavor)
  select new_id, l ->> 'item_id', (l ->> 'qty')::int, (l ->> 'unit_price_cents')::int, (l ->> 'unit_cost_cents')::int,
         coalesce((l ->> 'free')::boolean, false), coalesce(l ->> 'flavor', '')
  from jsonb_array_elements(lines) as l;

  return new_id;
end;
$$;
revoke all on function public.place_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb) to service_role;

-- Public catalog gains the flavor list (appended column).
create or replace view public.public_catalog as
select
  id, shelf, name, kind, unit_price_cents, weight_lb,
  case when tags_verified then tags else '{}'::jsonb end as tags,
  tags_verified, sort, flavors
from public.items
where active and not sold_out and (stock is null or stock > 0);
grant select on public.public_catalog to anon, authenticated;
