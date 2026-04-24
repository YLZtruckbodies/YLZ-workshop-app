-- AlterTable: add manualBomItems to Job
ALTER TABLE "Job" ADD COLUMN "manualBomItems" JSONB NOT NULL DEFAULT '[]';
