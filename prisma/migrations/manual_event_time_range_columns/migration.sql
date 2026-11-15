-- Prepared Migration (Do not execute automatically without explicit approval):
-- Optional explicit schedule columns for inquiries and quotations to complement
-- existing bookings.start_time / bookings.end_time and event_schedules.start_time / event_schedules.end_time,
-- as well as JSON-backed schedule metadata in inquiries.requirements and quotations.terms.

ALTER TABLE "inquiries"
  ADD COLUMN IF NOT EXISTS "requested_start_time" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "requested_end_time" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "approved_start_time" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "approved_end_time" VARCHAR(10);

ALTER TABLE "quotations"
  ADD COLUMN IF NOT EXISTS "requested_start_time" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "requested_end_time" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "start_time" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "end_time" VARCHAR(10);

