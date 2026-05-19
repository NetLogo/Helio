-- AlterTable
ALTER TABLE "ModelVersion" DROP COLUMN "previewImage",
ADD COLUMN     "previewImageFileKey" TEXT;
