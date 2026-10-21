-- Thanksgiving bags: schema. All money is integer cents.

create table public.admins (
  email text primary key check (email = lower(email))
);

create table public.items (
  id text primary key,
  shelf text not null,
  name text not null,
  kind text not null check (kind in ('amway', 'other')),
  cost_cents integer not null check (cost_cents >= 0),
  retail_cents integer check (retail_cents >= 0),
  pv numeric(8, 2),
  bv numeric(8, 2),
  weight_lb numeric(6, 2) not null default 0.1 check (weight_lb >= 0),
  box_size integer not null default 1 check (box_size >= 1),
  tags jsonb not null default '{}'::jsonb,
  tags_verified boolean not null default false,
  individually_wrapped boolean not null default true,
  stock integer check (stock >= 0),
  sold_out boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  unit_price_cents integer not null,
  -- Pricing floor, enforced in the database too: price * 0.97 >= cost + max(25% of cost, $0.50)
  constraint items_pricing_floor check (
    unit_price_cents * 97 >= 100 * cost_cents + greatest(25 * cost_cents, 5000)
  ),
  constraint items_price_step check (unit_price_cents % 25 = 0)
);

create table public.starter_bags (
  id text primary key,
  name text not null,
  blurb text not null default '',
  items jsonb not null default '{}'::jsonb, -- { item_id: qty }
  sort integer not null default 0,
  active boolean not null default true
);

create table public.settings (
  key text primary key,
  value jsonb not null
);

create table public.zips (
  zip text primary key check (zip ~ '^[0-9]{5}$'),
  zone text not null check (zone in ('near', 'far'))
);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  batch_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  status text not null default 'placed' check (status in
    ('placed', 'paid', 'ordered', 'packed', 'delivered', 'shipped', 'picked_up', 'cancelled', 'expired')),
  method text not null check (method in ('pickup', 'deliver', 'ship')),
  zone text check (zone in ('near', 'far')),
  name text,
  email text,
  phone text,
  address text,
  zip text,
  pay_method text not null check (pay_method in ('zelle', 'venmo', 'cashapp', 'cash')),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  shipping_quote_needed boolean not null default false,
  late boolean not null default false,
  needs_approval boolean not null default false,
  opt_followup boolean not null default false,
  opt_shoutout boolean not null default false,
  tracking text,
  ready_window text,
  notes text,
  test boolean not null default false,
  cash_confirmed boolean not null default false,
  adjustment_cents integer not null default 0, -- negative = refund
  batch_id uuid references public.batches (id) on delete set null,
  client_hash text,
  emails_sent jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  pii_purged_at timestamptz
);
create index orders_status_created on public.orders (status, created_at);
create index orders_client_hash on public.orders (client_hash, created_at);
create index orders_email on public.orders (email, created_at);

create table public.order_items (
  order_id uuid not null references public.orders (id) on delete cascade,
  item_id text not null references public.items (id),
  qty integer not null check (qty > 0),
  unit_price_cents integer not null,
  unit_cost_cents integer not null, -- snapshot; admin-only
  primary key (order_id, item_id)
);
