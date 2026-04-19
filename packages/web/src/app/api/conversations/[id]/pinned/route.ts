import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

const senderSelect = {
  id: true,
  nickname: true,
  avatarUrl: true,
} as const;

// GET /api/conversations/[id]/pinned — list pinned messages with cursor pagination
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, auth) => {
    const { id: conversationId } = await params;

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: auth.userId },
    });

    if (!participant) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") || "15", 10) || 15,
      50
    );

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        pinnedAt: { not: null },
        ...(cursor ? { pinnedAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        sender: { select: senderSelect },
      },
      orderBy: { pinnedAt: "desc" },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const sliced = hasMore ? messages.slice(0, limit) : messages;

    const items = sliced.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      sender: m.sender,
      text: m.text,
      replyToId: m.replyToId,
      replyTo: null,
      editedAt: m.editedAt?.toISOString() || null,
      deletedAt: m.deletedAt?.toISOString() || null,
      pinnedAt: m.pinnedAt?.toISOString() || null,
      createdAt: m.createdAt.toISOString(),
      status: "sent" as const,
    }));

    const nextCursor = hasMore ? items[items.length - 1].pinnedAt : null;

    return NextResponse.json({ items, hasMore, nextCursor });
  });
}
