-- DropIndex
DROP INDEX "ModelComment_parentId_idx";

-- CreateIndex
CREATE INDEX "ModelComment_parentId_createdAt_idx" ON "ModelComment"("parentId", "createdAt");
