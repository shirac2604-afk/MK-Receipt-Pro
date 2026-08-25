-- Keep the original partial active-device index. The tombstone migration
-- briefly introduced an equivalent index under a second name.

drop index if exists public.devices_business_active_idx;
