-- CreateIndex
CREATE INDEX "Message_conversationId_senderId_deletedAt_idx" ON "Message"("conversationId", "senderId", "deletedAt");
