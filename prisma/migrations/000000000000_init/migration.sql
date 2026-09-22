-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255),
    "role" VARCHAR(50) DEFAULT 'Customer',
    "phone" VARCHAR(50),
    "address" TEXT,
    "profile_image" TEXT,
    "notification_preferences" JSONB DEFAULT '{"bookingUpdates":true,"quotationNotifications":true,"paymentReminders":true,"eventReminders":true,"systemAnnouncements":true}',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(100),
    "short_desc" TEXT,
    "full_desc" TEXT,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "featured_image" TEXT,
    "icon_name" VARCHAR(50) DEFAULT 'Sparkles',
    "features" JSONB DEFAULT '[]',
    "inclusions" JSONB DEFAULT '[]',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "capacity" VARCHAR(100),
    "price" DECIMAL(10,2) NOT NULL,
    "original_price" DECIMAL(10,2),
    "is_popular" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "ideal_for" TEXT,
    "inclusions" JSONB DEFAULT '[]',
    "features" JSONB DEFAULT '[]',
    "services_included" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" SERIAL NOT NULL,
    "tracking_id" VARCHAR(50) NOT NULL,
    "user_id" INTEGER,
    "client_name" VARCHAR(100),
    "client_email" VARCHAR(100),
    "client_phone" VARCHAR(50),
    "event_type" VARCHAR(100) NOT NULL,
    "event_date" DATE NOT NULL,
    "event_venue" VARCHAR(255) NOT NULL,
    "guests_count" INTEGER NOT NULL,
    "requirements" TEXT,
    "selected_services" JSONB DEFAULT '[]',
    "package_id" VARCHAR(50),
    "notes" TEXT,
    "estimated_budget" VARCHAR(50),
    "status" VARCHAR(50) DEFAULT 'Pending Review',
    "cancelled_at" TIMESTAMP(6),
    "cancelled_by" VARCHAR(100),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" SERIAL NOT NULL,
    "quotation_ref" VARCHAR(50) NOT NULL,
    "inquiry_id" INTEGER,
    "user_id" INTEGER,
    "client_name" VARCHAR(100) NOT NULL,
    "client_email" VARCHAR(100) NOT NULL,
    "client_phone" VARCHAR(50),
    "event_type" VARCHAR(100) NOT NULL,
    "event_date" DATE NOT NULL,
    "venue" VARCHAR(255) NOT NULL,
    "guest_count" INTEGER NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discounts" JSONB DEFAULT '[]',
    "additional_charges" JSONB DEFAULT '[]',
    "grand_total" DECIMAL(12,2) NOT NULL,
    "required_downpayment" DECIMAL(12,2) NOT NULL,
    "valid_until" DATE NOT NULL,
    "validity_days" INTEGER NOT NULL DEFAULT 14,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Draft',
    "notes" TEXT,
    "terms" JSONB DEFAULT '[]',
    "sent_at" TIMESTAMP(6),
    "accepted_at" TIMESTAMP(6),
    "deposit_paid_at" TIMESTAMP(6),
    "confirmed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" SERIAL NOT NULL,
    "staff_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "role" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Available',
    "skills" JSONB DEFAULT '[]',
    "avatar" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_resources" (
    "id" SERIAL NOT NULL,
    "resource_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" VARCHAR(50) NOT NULL DEFAULT 'units',
    "condition" VARCHAR(50) NOT NULL DEFAULT 'Excellent',
    "assigned_service_id" VARCHAR(50),
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" SERIAL NOT NULL,
    "booking_ref" VARCHAR(50) NOT NULL,
    "user_id" INTEGER,
    "inquiry_id" INTEGER,
    "quotation_id" INTEGER,
    "client_name" VARCHAR(100) NOT NULL,
    "client_email" VARCHAR(100) NOT NULL,
    "client_phone" VARCHAR(50) NOT NULL,
    "event_title" VARCHAR(200) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "event_date" DATE NOT NULL,
    "start_time" VARCHAR(10) NOT NULL DEFAULT '17:00',
    "end_time" VARCHAR(10) NOT NULL DEFAULT '23:00',
    "venue" VARCHAR(255) NOT NULL,
    "guest_count" INTEGER NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Tentative',
    "cancellation_reason" TEXT,
    "rescheduled_from" DATE,
    "notes" TEXT,
    "confirmed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_services" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "service_id" INTEGER,
    "service_code" VARCHAR(50),
    "name" VARCHAR(150) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "booking_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_packages" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "package_id" INTEGER,
    "package_code" VARCHAR(50),
    "name" VARCHAR(150) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "booking_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_staff" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "role" VARCHAR(100),

    CONSTRAINT "booking_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_resources" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "resource_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "booking_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_schedules" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "event_date" DATE NOT NULL,
    "start_time" VARCHAR(10) NOT NULL DEFAULT '17:00',
    "end_time" VARCHAR(10) NOT NULL DEFAULT '23:00',
    "venue" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "timeline" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" SERIAL NOT NULL,
    "payment_ref" VARCHAR(50) NOT NULL,
    "receipt_number" VARCHAR(50) NOT NULL,
    "booking_id" INTEGER,
    "quotation_id" INTEGER,
    "client_name" VARCHAR(100) NOT NULL,
    "client_email" VARCHAR(100) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" VARCHAR(100) NOT NULL,
    "reference_number" VARCHAR(100) NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Pending Verification',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" VARCHAR(100),
    "verified_at" TIMESTAMP(6),
    "rejection_reason" TEXT,
    "rejected_by" VARCHAR(100),
    "rejected_at" TIMESTAMP(6),
    "proof_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "overall_rating" INTEGER NOT NULL,
    "service_rating" INTEGER NOT NULL,
    "staff_rating" INTEGER NOT NULL,
    "execution_rating" INTEGER NOT NULL,
    "comments" TEXT,
    "suggestions" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "used_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_identities" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "google_id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "inquiries_tracking_id_key" ON "inquiries"("tracking_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_quotation_ref_key" ON "quotations"("quotation_ref");

-- CreateIndex
CREATE UNIQUE INDEX "staff_staff_code_key" ON "staff"("staff_code");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_resources_resource_code_key" ON "equipment_resources"("resource_code");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_ref_key" ON "bookings"("booking_ref");

-- CreateIndex
CREATE UNIQUE INDEX "event_schedules_booking_id_key" ON "event_schedules"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_payment_ref_key" ON "payment_transactions"("payment_ref");

-- CreateIndex
CREATE UNIQUE INDEX "feedbacks_booking_id_key" ON "feedbacks"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "google_identities_user_id_key" ON "google_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "google_identities_google_id_key" ON "google_identities"("google_id");

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_packages" ADD CONSTRAINT "booking_packages_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_packages" ADD CONSTRAINT "booking_packages_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_staff" ADD CONSTRAINT "booking_staff_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_staff" ADD CONSTRAINT "booking_staff_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_resources" ADD CONSTRAINT "booking_resources_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_resources" ADD CONSTRAINT "booking_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "equipment_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_schedules" ADD CONSTRAINT "event_schedules_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_identities" ADD CONSTRAINT "google_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

