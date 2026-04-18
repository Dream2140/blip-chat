import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

const userSelect = {
  id: true,
  nickname: true,
  avatarUrl: true,
  bio: true,
  lastSeenAt: true,
  createdAt: true,
} as const;

// GET /api/conversations/[id]/pinned — list pinned messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (_req, auth) => {
    const { id: conversationId } = await params;

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: auth.userId },
    });

    if (!participant) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        pinnedAt: { not: null },
      },
      include: {
        sender: { select: userSelect },
      },
      orderBy: { pinnedAt: "desc" },
    });

    const items = messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      sender: {
        ...m.sender,
        lastSeenAt: m.sender.lastSeenAt.toISOString(),
        createdAt: m.sender.createdAt.toISOString(),
      },
      text: m.text,
      replyToId: m.replyToId,
      replyTo: null,
      editedAt: m.editedAt?.toISOString() || null,
      deletedAt: m.deletedAt?.toISOString() || null,
      pinnedAt: m.pinnedAt?.toISOString() || null,
      createdAt: m.createdAt.toISOString(),
      status: "sent" as const,
    }));

    return NextResponse.json({ items });
  });
}
