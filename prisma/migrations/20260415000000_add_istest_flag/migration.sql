-- AlterTable: add isTest flag to Job
ALTER TABLE "Job" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: add isTest flag to Quote
ALTER TABLE "Quote" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Quote_isTest_idx" ON "Quote"("isTest");
