-- CreateTable quotations
CREATE TABLE IF NOT EXISTS "quotations" (
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

-- CreateTable staff
CREATE TABLE IF NOT EXISTS "staff" (
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

-- CreateTable equipment_resources
CREATE TABLE IF NOT EXISTS "equipment_resources" (
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

-- CreateTable bookings
CREATE TABLE IF NOT EXISTS "bookings" (
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

-- CreateTable booking_services
CREATE TABLE IF NOT EXISTS "booking_services" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "service_id" INTEGER,
    "service_code" VARCHAR(50),
    "name" VARCHAR(150) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "booking_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable booking_packages
CREATE TABLE IF NOT EXISTS "booking_packages" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "package_id" INTEGER,
    "package_code" VARCHAR(50),
    "name" VARCHAR(150) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "booking_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable booking_staff
CREATE TABLE IF NOT EXISTS "booking_staff" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "role" VARCHAR(100),

    CONSTRAINT "booking_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable booking_resources
CREATE TABLE IF NOT EXISTS "booking_resources" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "resource_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "booking_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable event_schedules
CREATE TABLE IF NOT EXISTS "event_schedules" (
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

-- CreateTable payment_transactions
CREATE TABLE IF NOT EXISTS "payment_transactions" (
    "id" SERIAL NOT NULL,
    "payment_ref" VARCHAR(50) NOT NULL,
    "receipt_number" VARCHAR(50) NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "quotation_id" INTEGER,
    "client_name" VARCHAR(100) NOT NULL,
    "client_email" VARCHAR(100) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" VARCHAR(100) NOT NULL,
    "reference_number" VARCHAR(100) NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" VARCHAR(100),
    "verified_at" TIMESTAMP(6),
    "proof_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "quotations_quotation_ref_key" ON "quotations"("quotation_ref");
CREATE UNIQUE INDEX IF NOT EXISTS "staff_staff_code_key" ON "staff"("staff_code");
CREATE UNIQUE INDEX IF NOT EXISTS "equipment_resources_resource_code_key" ON "equipment_resources"("resource_code");
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_booking_ref_key" ON "bookings"("booking_ref");
CREATE UNIQUE INDEX IF NOT EXISTS "event_schedules_booking_id_key" ON "event_schedules"("booking_id");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_transactions_payment_ref_key" ON "payment_transactions"("payment_ref");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotations_inquiry_id_fkey') THEN
        ALTER TABLE "quotations" ADD CONSTRAINT "quotations_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotations_user_id_fkey') THEN
        ALTER TABLE "quotations" ADD CONSTRAINT "quotations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_user_id_fkey') THEN
        ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_inquiry_id_fkey') THEN
        ALTER TABLE "bookings" ADD CONSTRAINT "bookings_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_quotation_id_fkey') THEN
        ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_services_booking_id_fkey') THEN
        ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_services_service_id_fkey') THEN
        ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_packages_booking_id_fkey') THEN
        ALTER TABLE "booking_packages" ADD CONSTRAINT "booking_packages_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_packages_package_id_fkey') THEN
        ALTER TABLE "booking_packages" ADD CONSTRAINT "booking_packages_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_staff_booking_id_fkey') THEN
        ALTER TABLE "booking_staff" ADD CONSTRAINT "booking_staff_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_staff_staff_id_fkey') THEN
        ALTER TABLE "booking_staff" ADD CONSTRAINT "booking_staff_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_resources_booking_id_fkey') THEN
        ALTER TABLE "booking_resources" ADD CONSTRAINT "booking_resources_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_resources_resource_id_fkey') THEN
        ALTER TABLE "booking_resources" ADD CONSTRAINT "booking_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "equipment_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_schedules_booking_id_fkey') THEN
        ALTER TABLE "event_schedules" ADD CONSTRAINT "event_schedules_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_transactions_booking_id_fkey') THEN
        ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_transactions_quotation_id_fkey') THEN
        ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
