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

    // Fetch participant with cursor message's createdAt in one query
    const participantRows = await prisma.$queryRaw<
      Array<{ id: string; lastReadMessageCreatedAt: Date | null }>
    >`
      SELECT cp."id", m."createdAt" AS "lastReadMessageCreatedAt"
      FROM "ConversationParticipant" cp
      LEFT JOIN "Message" m ON m."id" = cp."lastReadMessageId"
      WHERE cp."conversationId" = ${conversationId} AND cp."userId" = ${auth.userId}
      LIMIT 1
    `;

    const participant = participantRows[0];
    if (!participant) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    // Only advance cursor if this message is newer than the current cursor
    if (
      participant.lastReadMessageCreatedAt &&
      participant.lastReadMessageCreatedAt >= targetMessage.createdAt
    ) {
      return NextResponse.json({ ok: true });
    }

    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: {
        lastReadMessageId: lastMessageId,
        lastReadAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  });
}
