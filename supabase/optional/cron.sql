-- OPTIONAL: run once per project (SQL editor) after enabling the pg_cron extension (Database > Extensions).
-- Runs the 48-hour expiry hourly directly in Postgres, so no secrets or HTTP calls are needed.
-- Cut line: if short on time, skip this and press "Expire unpaid" in the admin Orders tab instead.
select cron.schedule('expire-unpaid-orders', '7 * * * *', $$select public.expire_unpaid_orders(48)$$);
-- To remove: select cron.unschedule('expire-unpaid-orders');
