-- AlterTable
ALTER TABLE "UserNotification" DROP COLUMN "thumbnailKind",
DROP COLUMN "thumbnailUrl",
ADD COLUMN     "actorThumbnailUrl" TEXT,
ADD COLUMN     "actorUrl" TEXT,
ADD COLUMN     "targetThumbnailUrl" TEXT,
ADD COLUMN     "targetUrl" TEXT;
