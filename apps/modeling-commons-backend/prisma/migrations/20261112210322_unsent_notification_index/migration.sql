-- CreateIndex
CREATE INDEX "UserNotification_unsent_recipientId_createdAt_idx" ON "UserNotification"("recipientId", "createdAt") WHERE ("emailSentAt" IS NULL);
