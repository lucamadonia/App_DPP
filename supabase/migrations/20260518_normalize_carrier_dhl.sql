-- Normalize wh_shipments.carrier: collapse 'DHL Germany' into 'DHL'.
-- Two carrier values were drifting (a label-flow set 'DHL Germany', the
-- tracking-poll filter only matched 'DHL'), causing 32 Fambliss shipments
-- to be silently skipped by the cron-driven status sync.
--
-- The Edge Function filter is also being relaxed (`carrier ILIKE 'DHL%'`)
-- so future drift won't recreate this class of bug. This migration handles
-- the one-time data fix.

UPDATE wh_shipments
SET carrier = 'DHL'
WHERE carrier = 'DHL Germany';
