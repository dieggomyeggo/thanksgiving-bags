-- Spend bonus: expose the new settings keys to the storefront.
create or replace view public.public_settings as
select key, value
from public.settings
where key in (
  'cutoffShip', 'cutoffLocal', 'orderingCloses', 'shipTiers', 'farDeliveryCents', 'packagingLb',
  'minItems', 'freeItemCount', 'freeEveryItems', 'freeMaxItems',
  'bonusStartCents', 'bonusStepCents', 'bonusMaxItemCents', 'bonusMaxItems',
  'freeShelf', 'largeOrderItems', 'unpaidExpiryHours', 'charityName', 'ownerFirstName',
  'contactEmail', 'contactPhone', 'payments', 'learnMoreUrl', 'pickupNote', 'totals'
);
grant select on public.public_settings to anon, authenticated;
