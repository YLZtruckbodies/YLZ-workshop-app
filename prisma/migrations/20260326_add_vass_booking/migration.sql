-- CreateTable
CREATE TABLE "VassBooking" (
    "id" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL DEFAULT '',
    "quoteId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "bookingDate" TEXT NOT NULL DEFAULT '',
    "requestedBy" TEXT NOT NULL DEFAULT '',
    "companyAddress" TEXT NOT NULL DEFAULT '',
    "companyState" TEXT NOT NULL DEFAULT 'VIC',
    "companyPostcode" TEXT NOT NULL DEFAULT '',
    "companyEmail" TEXT NOT NULL DEFAULT '',
    "companyPhone" TEXT NOT NULL DEFAULT '',
    "poNumber" TEXT NOT NULL DEFAULT '',
    "finishDate" TEXT NOT NULL DEFAULT '',
    "ownerName" TEXT NOT NULL DEFAULT '',
    "ownerAddress" TEXT NOT NULL DEFAULT '',
    "ownerCity" TEXT NOT NULL DEFAULT '',
    "ownerState" TEXT NOT NULL DEFAULT 'VIC',
    "ownerPostcode" TEXT NOT NULL DEFAULT '',
    "vehicleMake" TEXT NOT NULL DEFAULT '',
    "vehicleModel" TEXT NOT NULL DEFAULT '',
    "engineType" TEXT NOT NULL DEFAULT '',
    "engineNumber" TEXT NOT NULL DEFAULT '',
    "rego" TEXT NOT NULL DEFAULT '',
    "compPlateDate" TEXT NOT NULL DEFAULT '',
    "odometer" TEXT NOT NULL DEFAULT '',
    "seats" TEXT NOT NULL DEFAULT '',
    "gvm" TEXT NOT NULL DEFAULT '',
    "gcm" TEXT NOT NULL DEFAULT '',
    "frontAxleRating" TEXT NOT NULL DEFAULT '',
    "rearAxleRating" TEXT NOT NULL DEFAULT '',
    "vinNumber" TEXT NOT NULL DEFAULT '',
    "frontTyreCount" TEXT NOT NULL DEFAULT '',
    "rearTyreCount" TEXT NOT NULL DEFAULT '',
    "frontTyreSize" TEXT NOT NULL DEFAULT '',
    "rearTyreSize" TEXT NOT NULL DEFAULT '',
    "extremeAxleSpacing" TEXT NOT NULL DEFAULT '',
    "modDescription" TEXT NOT NULL DEFAULT '',
    "newTareWeight" TEXT NOT NULL DEFAULT '',
    "vassCodes" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VassBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VassChassis" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "seatingCapacity" TEXT NOT NULL DEFAULT '',
    "gvm" TEXT NOT NULL DEFAULT '',
    "gcm" TEXT NOT NULL DEFAULT '',
    "frontAxleRating" TEXT NOT NULL DEFAULT '',
    "rearAxleRating" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "VassChassis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VassBooking_jobNumber_idx" ON "VassBooking"("jobNumber");

-- CreateIndex
CREATE INDEX "VassBooking_status_idx" ON "VassBooking"("status");

-- CreateIndex
CREATE INDEX "VassChassis_make_idx" ON "VassChassis"("make");
