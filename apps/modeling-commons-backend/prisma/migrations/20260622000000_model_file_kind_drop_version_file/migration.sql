-- CreateEnum
CREATE TYPE "ModelFileKind" AS ENUM ('model', 'additional');

-- DropForeignKey
ALTER TABLE "ModelVersionFile" DROP CONSTRAINT "ModelVersionFile_modelId_versionNumber_fkey";

-- DropTable
DROP TABLE "ModelVersionFile";

-- AlterTable
ALTER TABLE "ModelAdditionalFile" ADD COLUMN     "kind" "ModelFileKind" NOT NULL DEFAULT 'additional';
