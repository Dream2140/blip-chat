import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

// GET /api/messages/[id]/readers — returns users who have read up to this message
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (_req, auth) => {
    const { id } = await params;

    // Find the message
    const message = await prisma.message.findUnique({
      where: { id },
      select: { id: true, conversationId: true, senderId: true, createdAt: true },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Verify requesting user is a participant
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: { conversationId: message.conversationId, userId: auth.userId },
    });

    if (!isParticipant) {
      return NextResponse.json(
        { error: "Not a participant" },
        { status: 403 }
      );
    }

    // Find participants whose lastReadMessageId's message was created at or after this message
    // We need to join through the message to compare createdAt timestamps
    const readers = await prisma.conversationParticipant.findMany({
      where: {
        conversationId: message.conversationId,
        userId: { not: message.senderId },
        lastReadMessageId: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Filter: only include participants whose lastReadMessage was created at or after this message
    const readersWithMessages = await Promise.all(
      readers.map(async (r) => {
        if (!r.lastReadMessageId) return null;
        const lastReadMsg = await prisma.message.findUnique({
          where: { id: r.lastReadMessageId },
          select: { createdAt: true },
        });
        if (!lastReadMsg) return null;
        if (lastReadMsg.createdAt >= message.createdAt) {
          return {
            id: r.user.id,
            nickname: r.user.nickname,
            avatarUrl: r.user.avatarUrl,
          };
        }
        return null;
      })
    );

    const filteredReaders = readersWithMessages.filter(Boolean);

    return NextResponse.json({ readers: filteredReaders });
  });
}
