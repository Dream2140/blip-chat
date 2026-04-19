import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

// GET /api/conversations/[id] — get conversation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (_req, auth) => {
    const { id } = await params;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        participants: { some: { userId: auth.userId } },
      },
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

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const myParticipant = conversation.participants.find(
      (p) => p.userId === auth.userId
    );

    return NextResponse.json({
      conversation: {
        ...conversation,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        participants: conversation.participants.map((p) => ({
          ...p,
          joinedAt: p.joinedAt.toISOString(),
          user: {
            ...p.user,
            lastSeenAt: p.user.lastSeenAt
              ? (p.user.lastSeenAt as Date).toISOString()
              : null,
            createdAt: p.user.createdAt
              ? (p.user.createdAt as Date).toISOString()
              : null,
          },
        })),
        isMuted: myParticipant?.isMuted || false,
        isArchived: !!(myParticipant as Record<string, unknown>)?.archivedAt,
        isPinned: !!(myParticipant as Record<string, unknown>)?.pinnedAt,
      },
    });
  });
}

// PATCH /api/conversations/[id] — update group name/avatar
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, auth) => {
    const { id } = await params;
    const body = await req.json();

    // Verify user is admin
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId: id, userId: auth.userId, role: "ADMIN" },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Only admins can update the conversation" },
        { status: 403 }
      );
    }

    const conversation = await prisma.conversation.update({
      where: { id },
      data: {
        name: body.name,
        avatarUrl: body.avatarUrl,
      },
    });

    return NextResponse.json({ conversation });
  });
}
