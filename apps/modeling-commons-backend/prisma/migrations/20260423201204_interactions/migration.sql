-- CreateEnum
CREATE TYPE "ModelInteractionKind" AS ENUM ('view', 'run', 'download', 'share');

-- CreateTable
CREATE TABLE "ModelLike" (
    "modelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelLike_pkey" PRIMARY KEY ("modelId","userId")
);

-- CreateTable
CREATE TABLE "ModelInteraction" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "versionNumber" INTEGER,
    "kind" "ModelInteractionKind" NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "geo" JSONB,
    "cookie" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModelLike_userId_idx" ON "ModelLike"("userId");

-- CreateIndex
CREATE INDEX "ModelLike_modelId_createdAt_idx" ON "ModelLike"("modelId", "createdAt");

-- CreateIndex
CREATE INDEX "ModelInteraction_modelId_kind_createdAt_idx" ON "ModelInteraction"("modelId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "ModelInteraction_modelId_kind_userId_idx" ON "ModelInteraction"("modelId", "kind", "userId");

-- CreateIndex
CREATE INDEX "ModelInteraction_userId_createdAt_idx" ON "ModelInteraction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ModelInteraction_createdAt_idx" ON "ModelInteraction"("createdAt");

-- AddForeignKey
ALTER TABLE "ModelLike" ADD CONSTRAINT "ModelLike_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelLike" ADD CONSTRAINT "ModelLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelInteraction" ADD CONSTRAINT "ModelInteraction_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelInteraction" ADD CONSTRAINT "ModelInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
