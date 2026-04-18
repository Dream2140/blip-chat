import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

// POST /api/messages/[id]/reactions — toggle reaction (add or remove)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, auth) => {
    const { id: messageId } = await params;
    const body = await req.json();
    const { emoji } = body as { emoji: string };

    if (!emoji || emoji.length > 4) {
      return NextResponse.json(
        { error: "Invalid emoji" },
        { status: 400 }
      );
    }

    // Verify message exists
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Toggle: if reaction exists, remove it; otherwise add it
    const existing = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: { messageId, userId: auth.userId, emoji },
      },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.reaction.create({
        data: { messageId, userId: auth.userId, emoji },
      });
    }

    // Return updated reactions for this message
    const reactions = await prisma.reaction.findMany({
      where: { messageId },
    });

    // Group by emoji
    const grouped = reactions.reduce(
      (acc, r) => {
        if (!acc[r.emoji]) {
          acc[r.emoji] = { emoji: r.emoji, count: 0, byMe: false };
        }
        acc[r.emoji].count++;
        if (r.userId === auth.userId) acc[r.emoji].byMe = true;
        return acc;
      },
      {} as Record<string, { emoji: string; count: number; byMe: boolean }>
    );

    return NextResponse.json({
      reactions: Object.values(grouped),
      action: existing ? "removed" : "added",
    });
  });
}
