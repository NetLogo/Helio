-- AlterTable
ALTER TABLE "ModelAuthor" ADD COLUMN     "collaboratorType" TEXT;

-- CreateTable
CREATE TABLE "NonMemberContributor" (
    "id" TEXT NOT NULL,
    "legacyId" INTEGER NOT NULL,
    "modelId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "collaboratorType" TEXT,
    "addedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NonMemberContributor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NonMemberContributor_legacyId_key" ON "NonMemberContributor"("legacyId");

-- CreateIndex
CREATE INDEX "NonMemberContributor_modelId_idx" ON "NonMemberContributor"("modelId");

-- CreateIndex
CREATE INDEX "NonMemberContributor_email_idx" ON "NonMemberContributor"("email");

-- AddForeignKey
ALTER TABLE "NonMemberContributor" ADD CONSTRAINT "NonMemberContributor_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;
