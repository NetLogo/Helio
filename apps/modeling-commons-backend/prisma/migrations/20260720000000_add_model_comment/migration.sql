-- CreateTable
CREATE TABLE "ModelComment" (
    "id" TEXT NOT NULL,
    "legacyId" INTEGER,
    "parentId" TEXT,
    "userId" TEXT,
    "modelId" TEXT NOT NULL,
    "versionNumber" INTEGER,
    "content" TEXT,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "editedAt" TIMESTAMPTZ(3),
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ModelComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelCommentLike" (
    "modelCommentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelCommentLike_pkey" PRIMARY KEY ("modelCommentId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModelComment_legacyId_key" ON "ModelComment"("legacyId");

-- CreateIndex
CREATE INDEX "ModelComment_modelId_parentId_createdAt_idx" ON "ModelComment"("modelId", "parentId", "createdAt");

-- CreateIndex
CREATE INDEX "ModelComment_parentId_idx" ON "ModelComment"("parentId");

-- CreateIndex
CREATE INDEX "ModelComment_userId_idx" ON "ModelComment"("userId");

-- CreateIndex
CREATE INDEX "ModelCommentLike_userId_idx" ON "ModelCommentLike"("userId");

-- AddForeignKey
ALTER TABLE "ModelComment" ADD CONSTRAINT "ModelComment_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelComment" ADD CONSTRAINT "ModelComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelComment" ADD CONSTRAINT "ModelComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ModelComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelCommentLike" ADD CONSTRAINT "ModelCommentLike_modelCommentId_fkey" FOREIGN KEY ("modelCommentId") REFERENCES "ModelComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelCommentLike" ADD CONSTRAINT "ModelCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
