-- AlterTable
ALTER TABLE "Model" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Model" ADD COLUMN "runCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Model" ADD COLUMN "downloadCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Model" ADD COLUMN "shareCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Model_viewCount_idx" ON "Model"("viewCount");
CREATE INDEX "Model_runCount_idx" ON "Model"("runCount");
CREATE INDEX "Model_downloadCount_idx" ON "Model"("downloadCount");

-- Backfill denormalized counts from the ModelInteraction log
UPDATE "Model" m SET
  "viewCount" = c.v,
  "runCount" = c.r,
  "downloadCount" = c.d,
  "shareCount" = c.s
FROM (
  SELECT "modelId",
    count(*) FILTER (WHERE "kind" = 'view') AS v,
    count(*) FILTER (WHERE "kind" = 'run') AS r,
    count(*) FILTER (WHERE "kind" = 'download') AS d,
    count(*) FILTER (WHERE "kind" = 'share') AS s
  FROM "ModelInteraction"
  GROUP BY "modelId"
) c
WHERE m.id = c."modelId";
