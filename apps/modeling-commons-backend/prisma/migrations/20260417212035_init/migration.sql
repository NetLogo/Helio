/*
  Warnings:

  - You are about to drop the column `fileId` on the `ModelAdditionalFile` table. All the data in the column will be lost.
  - You are about to drop the column `nlogoxFileId` on the `ModelVersion` table. All the data in the column will be lost.
  - You are about to drop the column `fileId` on the `ModelVersionFile` table. All the data in the column will be lost.
  - You are about to drop the `File` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `fileKey` to the `ModelAdditionalFile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `netlogoFileKey` to the `ModelVersion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileKey` to the `ModelVersionFile` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ModelAdditionalFile" DROP CONSTRAINT "ModelAdditionalFile_fileId_fkey";

-- DropForeignKey
ALTER TABLE "ModelVersion" DROP CONSTRAINT "ModelVersion_nlogoxFileId_fkey";

-- DropForeignKey
ALTER TABLE "ModelVersionFile" DROP CONSTRAINT "ModelVersionFile_fileId_fkey";

-- DropIndex
DROP INDEX "ModelVersionFile_fileId_idx";

-- AlterTable
ALTER TABLE "ModelAdditionalFile" DROP COLUMN "fileId",
ADD COLUMN     "fileKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ModelVersion" DROP COLUMN "nlogoxFileId",
ADD COLUMN     "netlogoFileKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ModelVersionFile" DROP COLUMN "fileId",
ADD COLUMN     "fileKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "displayName" TEXT;

-- DropTable
DROP TABLE "File";

-- CreateIndex
CREATE INDEX "ModelVersionFile_fileKey_idx" ON "ModelVersionFile"("fileKey");
