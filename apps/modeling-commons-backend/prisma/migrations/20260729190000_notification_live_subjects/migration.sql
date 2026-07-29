-- AlterTable
ALTER TABLE "UserNotification" DROP COLUMN "actorThumbnailUrl",
DROP COLUMN "actorUrl",
DROP COLUMN "targetThumbnailUrl",
DROP COLUMN "targetUrl",
ADD COLUMN     "actorUserId" TEXT,
ADD COLUMN     "targetType" TEXT,
ADD COLUMN     "targetId" TEXT;
