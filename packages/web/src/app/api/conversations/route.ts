import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import { createConversationSchema } from "@/lib/validators";
import { publishMessageEvent } from "@/lib/redis";
import { SocketEvents } from "@chat-app/shared";
import { rateLimit } from "@/lib/rate-limit";

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
                lastSeenAt: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Unread counts via cursor: count messages after lastReadMessageId
    // Get current user's participant records with read cursors
    const myParticipants = await prisma.conversationParticipant.findMany({
      where: { userId: auth.userId, conversationId: { in: conversations.map((c) => c.id) } },
      select: { conversationId: true, lastReadMessageId: true },
    });
    const cursorMap = new Map(myParticipants.map((p) => [p.conversationId, p.lastReadMessageId]));

    // For conversations with a read cursor, count messages after that cursor's createdAt
    // For conversations without a cursor, count all messages from others
    const unreadMap = new Map<string, number>();
    const convoIds = conversations.map((c) => c.id);

    if (convoIds.length > 0) {
      // Conversations with no read cursor — count all messages from others
      const noCursorIds = convoIds.filter((id) => !cursorMap.get(id));
      if (noCursorIds.length > 0) {
        const counts = await prisma.message.groupBy({
          by: ["conversationId"],
          where: {
            conversationId: { in: noCursorIds },
            senderId: { not: auth.userId },
            deletedAt: null,
          },
          _count: true,
        });
        for (const c of counts) unreadMap.set(c.conversationId, c._count);
      }

      // Conversations with read cursor — batch count messages after each cursor
      const withCursorIds = convoIds.filter((id) => cursorMap.get(id));
      if (withCursorIds.length > 0) {
        const cursorMessageIds = withCursorIds.map((id) => cursorMap.get(id)!);

        // Single raw query: count messages after each cursor
        const unreadResults = await prisma.$queryRaw<
          Array<{ conversationId: string; count: bigint }>
        >`
          SELECT m."conversationId", COUNT(m."id") as count
          FROM "Message" m
          JOIN "Message" cursor ON cursor."id" = ANY(${cursorMessageIds}::text[])
            AND cursor."conversationId" = m."conversationId"
          WHERE m."conversationId" = ANY(${withCursorIds}::text[])
            AND m."senderId" != ${auth.userId}
            AND m."deletedAt" IS NULL
            AND m."createdAt" > cursor."createdAt"
          GROUP BY m."conversationId"
        `;

        for (const r of unreadResults) {
          unreadMap.set(r.conversationId, Number(r.count));
        }
      }
    }

    const items = conversations.map((c) => {
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
            user: {
              ...p.user,
              lastSeenAt: p.user.lastSeenAt ? (p.user.lastSeenAt as Date).toISOString() : null,
            },
            role: p.role,
            joinedAt: p.joinedAt.toISOString(),
          })),
          lastMessage: c.lastMessageId
            ? {
                id: c.lastMessageId,
                conversationId: c.id,
                senderId: c.lastMessageSenderId || "",
                sender: { id: c.lastMessageSenderId || "", nickname: "", avatarUrl: null } as never,
                text: c.lastMessagePreview || "",
                replyToId: null,
                replyTo: null,
                editedAt: null,
                deletedAt: null,
                createdAt: c.lastMessageAt?.toISOString() || c.updatedAt.toISOString(),
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
    if (!rateLimit(`newconv:${auth.userId}`, 10)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

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
