-- AlterTable
ALTER TABLE "UserNotification" DROP COLUMN "title",
DROP COLUMN "body",
ADD COLUMN     "payload" JSONB NOT NULL DEFAULT '{}';
