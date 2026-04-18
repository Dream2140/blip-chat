import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import { createConversationSchema } from "@/lib/validators";
import { publishMessageEvent } from "@/lib/redis";
import { SocketEvents } from "@chat-app/shared";

// GET /api/conversations — list user's conversations
export async function GET(request: NextRequest) {
  return withAuth(request, async (_req, auth) => {
    const conversations = await prisma.conversation.findMany({
      where: {
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
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: {
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
      orderBy: { updatedAt: "desc" },
    });

    // Batch unread counts in ONE query instead of N+1
    const convoIds = conversations.map((c) => c.id);
    const unreadCounts = convoIds.length > 0
      ? await prisma.message.groupBy({
          by: ["conversationId"],
          where: {
            conversationId: { in: convoIds },
            senderId: { not: auth.userId },
            deletedAt: null,
            readReceipts: { none: { userId: auth.userId } },
          },
          _count: true,
        })
      : [];
    const unreadMap = new Map(
      unreadCounts.map((u) => [u.conversationId, u._count])
    );

    const items = conversations.map((c) => {
        const lastMessage = c.messages[0] || null;
        const unreadCount = unreadMap.get(c.id) || 0;

        return {
          id: c.id,
          type: c.type,
          name: c.name,
          avatarUrl: c.avatarUrl,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          participants: c.participants.map((p) => ({
            id: p.id,
            userId: p.userId,
            user: { ...p.user, lastSeenAt: p.user.lastSeenAt.toISOString(), createdAt: p.user.createdAt.toISOString() },
            role: p.role,
            joinedAt: p.joinedAt.toISOString(),
          })),
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                conversationId: lastMessage.conversationId,
                senderId: lastMessage.senderId,
                sender: { ...lastMessage.sender, lastSeenAt: lastMessage.sender.lastSeenAt.toISOString(), createdAt: lastMessage.sender.createdAt.toISOString() },
                text: lastMessage.text,
                replyToId: lastMessage.replyToId,
                replyTo: null,
                editedAt: lastMessage.editedAt?.toISOString() || null,
                deletedAt: lastMessage.deletedAt?.toISOString() || null,
                createdAt: lastMessage.createdAt.toISOString(),
                status: "sent" as const,
              }
            : null,
          unreadCount,
        };
      });

    return NextResponse.json({ items });
  });
}

// POST /api/conversations — create conversation
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth) => {
    const body = await req.json();
    const result = createConversationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { type, participantIds, name } = result.data;

    // For DIRECT, check if conversation already exists
    if (type === "DIRECT") {
      if (participantIds.length !== 1) {
        return NextResponse.json(
          { error: "Direct chat requires exactly one other participant" },
          { status: 400 }
        );
      }

      const otherId = participantIds[0];

      // Find existing direct conversation
      const existing = await prisma.conversation.findFirst({
        where: {
          type: "DIRECT",
          AND: [
            { participants: { some: { userId: auth.userId } } },
            { participants: { some: { userId: otherId } } },
          ],
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

      if (existing) {
        return NextResponse.json({
          conversation: {
            ...existing,
            createdAt: existing.createdAt.toISOString(),
            updatedAt: existing.updatedAt.toISOString(),
            participants: existing.participants.map((p) => ({
              ...p,
              joinedAt: p.joinedAt.toISOString(),
              user: { ...p.user, lastSeenAt: p.user.lastSeenAt.toISOString(), createdAt: p.user.createdAt.toISOString() },
            })),
            lastMessage: null,
            unreadCount: 0,
          },
        });
      }
    }

    // Create conversation
    const allParticipantIds = [auth.userId, ...participantIds.filter((id: string) => id !== auth.userId)];

    const conversation = await prisma.conversation.create({
      data: {
        type,
        name: type === "GROUP" ? name || null : null,
        participants: {
          create: allParticipantIds.map((userId: string, index: number) => ({
            userId,
            role: index === 0 ? "ADMIN" : "MEMBER",
          })),
        },
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

    // Publish to Redis for real-time notification
    await publishMessageEvent(SocketEvents.CONVERSATION_CREATED, {
      id: conversation.id,
      type: conversation.type,
      name: conversation.name,
      participants: conversation.participants.map((p) => ({
        userId: p.userId,
        role: p.role,
      })),
    });

    return NextResponse.json({
      conversation: {
        ...conversation,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        participants: conversation.participants.map((p) => ({
          ...p,
          joinedAt: p.joinedAt.toISOString(),
          user: { ...p.user, lastSeenAt: p.user.lastSeenAt.toISOString(), createdAt: p.user.createdAt.toISOString() },
        })),
        lastMessage: null,
        unreadCount: 0,
      },
    });
  });
}
