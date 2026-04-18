import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import { sendMessageSchema } from "@/lib/validators";
import { publishMessageEvent } from "@/lib/redis";
import { SocketEvents } from "@chat-app/shared";

function groupReactions(
  reactions: Array<{ emoji: string; userId: string }>,
  currentUserId: string
) {
  const grouped: Record<string, { emoji: string; count: number; byMe: boolean }> = {};
  for (const r of reactions) {
    if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, byMe: false };
    grouped[r.emoji].count++;
    if (r.userId === currentUserId) grouped[r.emoji].byMe = true;
  }
  return Object.values(grouped);
}

const userSelect = {
  id: true,
  nickname: true,
  avatarUrl: true,
  bio: true,
  lastSeenAt: true,
  createdAt: true,
} as const;

// GET /api/conversations/[id]/messages — paginated message history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, auth) => {
    const { id: conversationId } = await params;
    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") || "50", 10),
      100
    );

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
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        sender: { select: userSelect },
        replyTo: {
          include: { sender: { select: userSelect } },
        },
        reactions: true,
        readReceipts: { select: { userId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const items = (hasMore ? messages.slice(0, limit) : messages)
      .reverse()
      .map((m) => ({
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
        replyTo: m.replyTo
          ? {
              ...m.replyTo,
              sender: {
                ...m.replyTo.sender,
                lastSeenAt: m.replyTo.sender.lastSeenAt.toISOString(),
                createdAt: m.replyTo.sender.createdAt.toISOString(),
              },
              replyToId: m.replyTo.replyToId,
              replyTo: null,
              editedAt: m.replyTo.editedAt?.toISOString() || null,
              deletedAt: m.replyTo.deletedAt?.toISOString() || null,
              createdAt: m.replyTo.createdAt.toISOString(),
              status: "sent" as const,
            }
          : null,
        editedAt: m.editedAt?.toISOString() || null,
        deletedAt: m.deletedAt?.toISOString() || null,
        pinnedAt: m.pinnedAt?.toISOString() || null,
        createdAt: m.createdAt.toISOString(),
        // Status: "read" if anyone (other than sender) has a read receipt, else "sent"
        status: (m.senderId === auth.userId && m.readReceipts.some((r: { userId: string }) => r.userId !== auth.userId))
          ? "read" as const
          : "sent" as const,
        reactions: groupReactions(m.reactions, auth.userId),
      }));

    const nextCursor = hasMore
      ? messages[messages.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({ items, nextCursor, hasMore });
  });
}

// POST /api/conversations/[id]/messages — send message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, auth) => {
    const { id: conversationId } = await params;
    const body = await req.json();
    const result = sendMessageSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: auth.userId },
    });

    if (!participant) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: auth.userId,
        text: result.data.text,
        replyToId: result.data.replyToId || null,
      },
      include: {
        sender: { select: userSelect },
        replyTo: {
          include: { sender: { select: userSelect } },
        },
      },
    });

    // Update conversation's updatedAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Publish to Redis for real-time delivery
    await publishMessageEvent(SocketEvents.MESSAGE_NEW, {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      text: message.text,
      replyToId: message.replyToId,
      createdAt: message.createdAt.toISOString(),
    });

    return NextResponse.json({
      message: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        sender: {
          ...message.sender,
          lastSeenAt: message.sender.lastSeenAt.toISOString(),
          createdAt: message.sender.createdAt.toISOString(),
        },
        text: message.text,
        replyToId: message.replyToId,
        replyTo: message.replyTo
          ? {
              id: message.replyTo.id,
              conversationId: message.replyTo.conversationId,
              senderId: message.replyTo.senderId,
              sender: {
                ...message.replyTo.sender,
                lastSeenAt: message.replyTo.sender.lastSeenAt.toISOString(),
                createdAt: message.replyTo.sender.createdAt.toISOString(),
              },
              text: message.replyTo.text,
              replyToId: message.replyTo.replyToId,
              replyTo: null,
              editedAt: message.replyTo.editedAt?.toISOString() || null,
              deletedAt: message.replyTo.deletedAt?.toISOString() || null,
              createdAt: message.replyTo.createdAt.toISOString(),
              status: "sent" as const,
            }
          : null,
        editedAt: null,
        deletedAt: null,
        createdAt: message.createdAt.toISOString(),
        status: "sent" as const,
      },
    });
  });
}
