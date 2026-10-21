-- Server-side helpers. Orders are only ever created by the place-order Edge Function (service role).

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

  insert into public.order_items (order_id, item_id, qty, unit_price_cents, unit_cost_cents, free)
  select new_id, l ->> 'item_id', (l ->> 'qty')::int, (l ->> 'unit_price_cents')::int, (l ->> 'unit_cost_cents')::int,
         coalesce((l ->> 'free')::boolean, false)
  from jsonb_array_elements(lines) as l;

  return new_id;
end;
$$;
revoke all on function public.place_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb) to service_role;

-- Cancels Placed orders unpaid after the window. Cash orders pay on collection and large orders await approval, so both are exempt.
create or replace function public.expire_unpaid_orders(hours integer default 48) returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  update public.orders
     set status = 'expired'
   where status = 'placed'
     and pay_method <> 'cash'
     and not needs_approval
     and created_at < now() - make_interval(hours => hours);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.expire_unpaid_orders(integer) from public, anon, authenticated;
grant execute on function public.expire_unpaid_orders(integer) to service_role;

-- Nulls personal data, keeps anonymous order rows (for the donation totals).
create or replace function public.purge_order_pii() returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'not allowed';
  end if;
  update public.orders
     set name = null, email = null, phone = null, address = null, zip = null,
         client_hash = null, notes = null, tracking = null, ready_window = null, pii_purged_at = now()
   where pii_purged_at is null;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.purge_order_pii() from public, anon;
grant execute on function public.purge_order_pii() to authenticated, service_role;
