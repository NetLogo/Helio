-- AlterTable
ALTER TABLE "EmailQueue" ADD COLUMN     "nextAttemptAt" TIMESTAMPTZ(3);
