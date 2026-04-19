import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

// POST /api/conversations/[id]/participants — add participants (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, auth) => {
    const { id: conversationId } = await params;
    const body = await req.json();
    const { userIds } = body as { userIds: string[] };

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "userIds array required" },
        { status: 400 }
      );
    }

    if (userIds.length > 50) {
      return NextResponse.json(
        { error: "Cannot add more than 50 participants at once" },
        { status: 400 }
      );
    }

    // Verify conversation is GROUP and user is admin
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, type: "GROUP" },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Group conversation not found" },
        { status: 404 }
      );
    }

    const isAdmin = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: auth.userId, role: "ADMIN" },
    });

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admins can add participants" },
        { status: 403 }
      );
    }

    // Add participants, skip already existing
    const existing = await prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { in: userIds } },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map((e) => e.userId));
    const newIds = userIds.filter((id: string) => !existingIds.has(id));

    if (newIds.length > 0) {
      await prisma.conversationParticipant.createMany({
        data: newIds.map((userId: string) => ({
          conversationId,
          userId,
          role: "MEMBER" as const,
        })),
      });
    }

    const updated = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatarUrl: true,
                bio: true,
                lastSeenAt: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ conversation: updated });
  });
}
