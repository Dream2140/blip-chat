import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/messages/[id]/pin — toggle pin/unpin
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (_req, auth) => {
    if (!rateLimit(`pin:${auth.userId}`, 10)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id: messageId } = await params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: { conversationId: message.conversationId, userId: auth.userId },
    });
    if (!isParticipant) {
      return NextResponse.json(
        { error: "Not a participant" },
        { status: 403 }
      );
    }

    const isPinned = message.pinnedAt !== null;

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: isPinned
        ? { pinnedAt: null, pinnedById: null }
        : { pinnedAt: new Date(), pinnedById: auth.userId },
    });

    return NextResponse.json({
      pinnedAt: updated.pinnedAt?.toISOString() || null,
      pinnedById: updated.pinnedById,
    });
  });
}
