/*
  Warnings:

  - A unique constraint covering the columns `[legacyId]` on the table `Model` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[legacyId]` on the table `Tag` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[legacyId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Model" ADD COLUMN     "legacyId" INTEGER;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "legacyId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "legacyId" INTEGER,
ADD COLUMN     "onboardedAt" TIMESTAMPTZ(3);

-- CreateIndex
CREATE UNIQUE INDEX "Model_legacyId_key" ON "Model"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_legacyId_key" ON "Tag"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "User_legacyId_key" ON "User"("legacyId");
