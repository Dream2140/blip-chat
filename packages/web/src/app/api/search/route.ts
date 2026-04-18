import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

export interface MessageSearchResult {
  id: string;
  text: string;
  conversationId: string;
  senderId: string;
  senderNickname: string;
  createdAt: string;
}

// GET /api/search?q=<query> — global search across users and messages
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth) => {
    const q = req.nextUrl.searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ users: [], messages: [] });
    }

    // Search users by nickname (case-insensitive contains, exclude current user)
    const users = await prisma.user.findMany({
      where: {
        id: { not: auth.userId },
        nickname: { contains: q, mode: "insensitive" },
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        lastSeenAt: true,
        createdAt: true,
      },
      orderBy: { lastSeenAt: "desc" },
      take: 5,
    });

    // Find conversation IDs the current user participates in
    const participantRecords = await prisma.conversationParticipant.findMany({
      where: { userId: auth.userId },
      select: { conversationId: true },
    });
    const conversationIds = participantRecords.map((p) => p.conversationId);

    // Search messages by text in those conversations
    const messages = await prisma.message.findMany({
      where: {
        conversationId: { in: conversationIds },
        deletedAt: null,
        text: { contains: q, mode: "insensitive" },
      },
      include: {
        sender: {
          select: { nickname: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const messageResults: MessageSearchResult[] = messages.map((m) => ({
      id: m.id,
      text: m.text,
      conversationId: m.conversationId,
      senderId: m.senderId,
      senderNickname: m.sender.nickname,
      createdAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json({
      users: users.map((u) => ({
        ...u,
        lastSeenAt: u.lastSeenAt.toISOString(),
        createdAt: u.createdAt.toISOString(),
      })),
      messages: messageResults,
    });
  });
}
