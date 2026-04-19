import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

// GET /api/sync?since=<ISO timestamp>
// Returns new/updated messages and conversation changes since the given timestamp.
// Called by client after WebSocket reconnect to catch up on missed events.
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth) => {
    const since = req.nextUrl.searchParams.get("since");
    if (!since) {
      return NextResponse.json({ error: "since parameter required" }, { status: 400 });
    }

    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Get user's conversation IDs
    const participations = await prisma.conversationParticipant.findMany({
      where: { userId: auth.userId },
      select: { conversationId: true },
    });
    const convoIds = participations.map((p) => p.conversationId);

    if (convoIds.length === 0) {
      return NextResponse.json({ messages: [], conversations: [], deletedMessageIds: [] });
    }

    // New messages since timestamp (limit 200 to avoid massive payloads)
    const newMessages = await prisma.message.findMany({
      where: {
        conversationId: { in: convoIds },
        createdAt: { gt: sinceDate },
        deletedAt: null,
      },
      include: {
        sender: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    // Edited messages since timestamp
    const editedMessages = await prisma.message.findMany({
      where: {
        conversationId: { in: convoIds },
        editedAt: { gt: sinceDate },
        deletedAt: null,
      },
      select: {
        id: true,
        conversationId: true,
        text: true,
        editedAt: true,
      },
      take: 100,
    });

    // Deleted messages since timestamp
    const deletedMessages = await prisma.message.findMany({
      where: {
        conversationId: { in: convoIds },
        deletedAt: { gt: sinceDate },
      },
      select: { id: true, conversationId: true },
      take: 100,
    });

    // Conversations updated since timestamp (for aggregate changes)
    const updatedConversations = await prisma.conversation.findMany({
      where: {
        id: { in: convoIds },
        updatedAt: { gt: sinceDate },
      },
      select: {
        id: true,
        lastMessageId: true,
        lastMessageAt: true,
        lastMessagePreview: true,
        lastMessageSenderId: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      messages: newMessages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderNickname: m.sender.nickname,
        text: m.text,
        replyToId: m.replyToId,
        createdAt: m.createdAt.toISOString(),
      })),
      editedMessages: editedMessages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        text: m.text,
        editedAt: m.editedAt?.toISOString() || null,
      })),
      deletedMessageIds: deletedMessages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
      })),
      conversations: updatedConversations.map((c) => ({
        id: c.id,
        lastMessageId: c.lastMessageId,
        lastMessageAt: c.lastMessageAt?.toISOString() || null,
        lastMessagePreview: c.lastMessagePreview,
        lastMessageSenderId: c.lastMessageSenderId,
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  });
}
