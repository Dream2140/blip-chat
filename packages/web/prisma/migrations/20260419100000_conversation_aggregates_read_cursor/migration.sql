-- Conversation aggregates (maintained on message send)
ALTER TABLE "Conversation" ADD COLUMN "lastMessageId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "lastMessageAt" TIMESTAMP(3);
ALTER TABLE "Conversation" ADD COLUMN "lastMessagePreview" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "lastMessageSenderId" TEXT;

-- Read cursor on participant (replaces per-message receipt counting for unread)
ALTER TABLE "ConversationParticipant" ADD COLUMN "lastReadMessageId" TEXT;
ALTER TABLE "ConversationParticipant" ADD COLUMN "lastReadAt" TIMESTAMP(3);

-- Index for sidebar sorting by last message
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

-- Backfill conversation aggregates from existing messages
UPDATE "Conversation" c
SET
  "lastMessageId" = sub.id,
  "lastMessageAt" = sub."createdAt",
  "lastMessagePreview" = LEFT(sub.text, 100),
  "lastMessageSenderId" = sub."senderId"
FROM (
  SELECT DISTINCT ON ("conversationId")
    id, "conversationId", "createdAt", text, "senderId"
  FROM "Message"
  WHERE "deletedAt" IS NULL
  ORDER BY "conversationId", "createdAt" DESC
) sub
WHERE c.id = sub."conversationId";

-- Backfill read cursors from existing read receipts
-- For each participant, find the latest message they've read
UPDATE "ConversationParticipant" cp
SET
  "lastReadMessageId" = sub."messageId",
  "lastReadAt" = sub."readAt"
FROM (
  SELECT DISTINCT ON (m."conversationId", rr."userId")
    m."conversationId",
    rr."userId",
    rr."messageId",
    rr."readAt"
  FROM "MessageReadReceipt" rr
  JOIN "Message" m ON m.id = rr."messageId"
  ORDER BY m."conversationId", rr."userId", m."createdAt" DESC
) sub
WHERE cp."conversationId" = sub."conversationId"
  AND cp."userId" = sub."userId";
