-- User privacy settings
ALTER TABLE "User" ADD COLUMN "hideReadReceipts" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "hideOnlineStatus" BOOLEAN NOT NULL DEFAULT false;

-- Conversation participant management
ALTER TABLE "ConversationParticipant" ADD COLUMN "isMuted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConversationParticipant" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "ConversationParticipant" ADD COLUMN "pinnedAt" TIMESTAMP(3);
ALTER TABLE "ConversationParticipant" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Block model
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "Block"("blockerId", "blockedId");
CREATE INDEX "Block_blockerId_idx" ON "Block"("blockerId");
CREATE INDEX "Block_blockedId_idx" ON "Block"("blockedId");
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- StarredMessage model
CREATE TABLE "StarredMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StarredMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StarredMessage_userId_messageId_key" ON "StarredMessage"("userId", "messageId");
CREATE INDEX "StarredMessage_userId_createdAt_idx" ON "StarredMessage"("userId", "createdAt");
ALTER TABLE "StarredMessage" ADD CONSTRAINT "StarredMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StarredMessage" ADD CONSTRAINT "StarredMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
