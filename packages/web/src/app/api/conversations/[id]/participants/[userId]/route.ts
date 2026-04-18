import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

// DELETE /api/conversations/[id]/participants/[userId] — remove participant or leave
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  return withAuth(request, async (_req, auth) => {
    const { id: conversationId, userId: targetUserId } = await params;

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, type: "GROUP" },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Group conversation not found" },
        { status: 404 }
      );
    }

    const isSelf = targetUserId === auth.userId;

    if (!isSelf) {
      // Only admins can remove others
      const isAdmin = await prisma.conversationParticipant.findFirst({
        where: { conversationId, userId: auth.userId, role: "ADMIN" },
      });

      if (!isAdmin) {
        return NextResponse.json(
          { error: "Only admins can remove participants" },
          { status: 403 }
        );
      }
    }

    await prisma.conversationParticipant.deleteMany({
      where: { conversationId, userId: targetUserId },
    });

    return NextResponse.json({ success: true });
  });
}
