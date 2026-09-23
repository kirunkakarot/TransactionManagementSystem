-- AlterTable
ALTER TABLE "inquiries" ADD COLUMN     "custom_event_description" VARCHAR(100),
ADD COLUMN     "event_type_id" INTEGER;

-- CreateTable
CREATE TABLE "event_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EventTypeToService" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_EventTypeToService_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EventTypeToPackage" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_EventTypeToPackage_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_types_name_key" ON "event_types"("name");

-- CreateIndex
CREATE INDEX "_EventTypeToService_B_index" ON "_EventTypeToService"("B");

-- CreateIndex
CREATE INDEX "_EventTypeToPackage_B_index" ON "_EventTypeToPackage"("B");

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventTypeToService" ADD CONSTRAINT "_EventTypeToService_A_fkey" FOREIGN KEY ("A") REFERENCES "event_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventTypeToService" ADD CONSTRAINT "_EventTypeToService_B_fkey" FOREIGN KEY ("B") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventTypeToPackage" ADD CONSTRAINT "_EventTypeToPackage_A_fkey" FOREIGN KEY ("A") REFERENCES "event_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventTypeToPackage" ADD CONSTRAINT "_EventTypeToPackage_B_fkey" FOREIGN KEY ("B") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed Initial Data
INSERT INTO "event_types" ("name", "description", "is_active") VALUES
('Birthday Celebration', 'Standard birthday celebration event.', true),
('Grand Wedding', 'Grand Wedding & Reception event.', true),
('18th Debut', '18th Debut Milestone event.', true),
('Corporate Gala', 'Corporate Gala / Launch event.', true),
('Anniversary Party', 'Anniversary & Reunion event.', true) ON CONFLICT ("name") DO NOTHING;
