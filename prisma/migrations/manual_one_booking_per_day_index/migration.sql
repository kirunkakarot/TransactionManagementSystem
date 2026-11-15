-- Optional database-level partial unique index to enforce the JAD Events One Booking Per Day rule.
-- NOTE: Do NOT execute automatically until historical duplicate dates (if any) are reviewed and approved.
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_unique_active_event_date_idx"
ON "bookings" ("event_date")
WHERE "status" NOT IN ('Cancelled', 'Canceled', 'Rejected');

