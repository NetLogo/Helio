-- CreateTable
CREATE TABLE "NotificationDigest" (
    "recipientId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDigest_pkey" PRIMARY KEY ("recipientId","day")
);

-- CreateIndex
CREATE INDEX "NotificationDigest_day_idx" ON "NotificationDigest"("day");

-- AddForeignKey
ALTER TABLE "NotificationDigest" ADD CONSTRAINT "NotificationDigest_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
