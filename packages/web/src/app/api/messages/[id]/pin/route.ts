import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

// POST /api/messages/[id]/pin — toggle pin/unpin
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (_req, auth) => {
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
