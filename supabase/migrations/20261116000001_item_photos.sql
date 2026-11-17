-- Item photos and product links: shown on the storefront, edited by admins.
alter table public.items add column image_url text;
alter table public.items add column product_url text;

create or replace view public.public_catalog as
select
  id, shelf, name, kind, unit_price_cents, weight_lb,
  case when tags_verified then tags else '{}'::jsonb end as tags,
  tags_verified, sort, flavors, image_url, product_url
from public.items
where active and not sold_out and (stock is null or stock > 0);
grant select on public.public_catalog to anon, authenticated;

-- Public bucket for item photos: anyone can view a photo by URL, only admins can add, replace or remove.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy item_images_admin_select on storage.objects for select to authenticated using (bucket_id = 'item-images' and public.is_admin());
create policy item_images_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'item-images' and public.is_admin());
create policy item_images_admin_update on storage.objects for update to authenticated using (bucket_id = 'item-images' and public.is_admin()) with check (bucket_id = 'item-images' and public.is_admin());
create policy item_images_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'item-images' and public.is_admin());
