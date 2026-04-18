import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

// POST /api/conversations/[id]/read — mark messages as read
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, auth) => {
    const { id: conversationId } = await params;
    const body = await req.json();
    const { lastMessageId } = body as { lastMessageId: string };

    if (!lastMessageId) {
      return NextResponse.json(
        { error: "lastMessageId required" },
        { status: 400 }
      );
    }

    // Get the target message to find its createdAt
    const targetMessage = await prisma.message.findFirst({
      where: { id: lastMessageId, conversationId },
    });

    if (!targetMessage) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Find all unread messages up to this one
    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: auth.userId },
        deletedAt: null,
        createdAt: { lte: targetMessage.createdAt },
        readReceipts: {
          none: { userId: auth.userId },
        },
      },
      select: { id: true },
    });

    if (unreadMessages.length > 0) {
      await prisma.messageReadReceipt.createMany({
        data: unreadMessages.map((m) => ({
          messageId: m.id,
          userId: auth.userId,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      markedCount: unreadMessages.length,
    });
  });
}
