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

    return NextResponse.json({ conversation });
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
