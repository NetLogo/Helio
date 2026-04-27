-- Drop any existing draft versions (pre-beta cleanup).
DELETE FROM "Model" WHERE "id" IN (
  SELECT "modelId" FROM "ModelVersion"
  WHERE "isDraft" = true
  GROUP BY "modelId"
  HAVING COUNT(*) = (SELECT COUNT(*) FROM "ModelVersion" mv WHERE mv."modelId" = "ModelVersion"."modelId")
);

-- AlterTable
ALTER TABLE "ModelVersion" DROP COLUMN "isDraft";

-- CreateTable
CREATE TABLE "ModelDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modelId" TEXT,
    "schemaVersion" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModelDraft_userId_idx" ON "ModelDraft"("userId");

-- CreateIndex
CREATE INDEX "ModelDraft_modelId_idx" ON "ModelDraft"("modelId");

-- AddForeignKey
ALTER TABLE "ModelDraft" ADD CONSTRAINT "ModelDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelDraft" ADD CONSTRAINT "ModelDraft_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;
