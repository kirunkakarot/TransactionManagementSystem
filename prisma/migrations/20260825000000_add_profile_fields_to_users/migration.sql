-- AlterTable
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "phone" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "address" TEXT,
ADD COLUMN IF NOT EXISTS "profile_image" TEXT,
ADD COLUMN IF NOT EXISTS "notification_preferences" JSONB DEFAULT '{"bookingUpdates":true,"quotationNotifications":true,"paymentReminders":true,"eventReminders":true,"systemAnnouncements":true}',
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;
