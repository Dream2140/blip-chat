import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

const VALID_ACTIONS = [
  "mute",
  "unmute",
  "archive",
  "unarchive",
  "pin",
  "unpin",
  "delete",
] as const;

type ManageAction = (typeof VALID_ACTIONS)[number];

// PATCH /api/conversations/[id]/manage
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, auth) => {
    const { id: conversationId } = await params;
    const body = await req.json();
    const action = body.action as ManageAction;

    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify the user is a participant
    const existing = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: auth.userId,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Not a participant of this conversation" },
        { status: 403 }
      );
    }

    // Build update data based on action
    let data: Record<string, unknown>;
    switch (action) {
      case "mute":
        data = { isMuted: true };
        break;
      case "unmute":
        data = { isMuted: false };
        break;
      case "archive":
        data = { archivedAt: new Date() };
        break;
      case "unarchive":
        data = { archivedAt: null };
        break;
      case "pin":
        data = { pinnedAt: new Date() };
        break;
      case "unpin":
        data = { pinnedAt: null };
        break;
      case "delete":
        data = { deletedAt: new Date() };
        break;
    }

    const updated = await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: auth.userId,
        },
      },
      data,
    });

    return NextResponse.json({
      success: true,
      action,
      isMuted: updated.isMuted,
      isArchived: !!updated.archivedAt,
      isPinned: !!updated.pinnedAt,
      isDeleted: !!updated.deletedAt,
    });
  });
}
