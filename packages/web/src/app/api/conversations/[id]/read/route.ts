import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

// POST /api/conversations/[id]/read — mark messages as read (cursor-based)
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

    // Verify message exists
    const targetMessage = await prisma.message.findFirst({
      where: { id: lastMessageId, conversationId },
      select: { id: true, createdAt: true },
    });

    if (!targetMessage) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Update participant's read cursor (only advance forward, never back)
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: auth.userId },
      select: { id: true, lastReadMessageId: true },
    });

    if (!participant) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    // Only advance cursor if this message is newer
    let shouldUpdate = true;
    if (participant.lastReadMessageId) {
      const currentCursor = await prisma.message.findFirst({
        where: { id: participant.lastReadMessageId },
        select: { createdAt: true },
      });
      if (currentCursor && currentCursor.createdAt >= targetMessage.createdAt) {
        shouldUpdate = false;
      }
    }

    if (shouldUpdate) {
      await prisma.conversationParticipant.update({
        where: { id: participant.id },
        data: {
          lastReadMessageId: lastMessageId,
          lastReadAt: new Date(),
        },
      });
    }

    return NextResponse.json({ ok: true });
  });
}
