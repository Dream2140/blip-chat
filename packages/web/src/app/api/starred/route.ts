import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";

// GET /api/starred — list user's starred messages with cursor-based pagination
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth) => {
    if (!rateLimit(`starred-list:${auth.userId}`, 30)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = req.nextUrl;
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    const starred = await prisma.starredMessage.findMany({
      where: {
        userId: auth.userId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        message: {
          include: {
            sender: {
              select: { id: true, nickname: true, avatarUrl: true },
            },
          },
        },
      },
    });

    const hasMore = starred.length > limit;
    const items = hasMore ? starred.slice(0, limit) : starred;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({
      starred: items.map((s) => ({
        id: s.id,
        starredAt: s.createdAt.toISOString(),
        messageId: s.messageId,
        text: s.message.text,
        conversationId: s.message.conversationId,
        sender: s.message.sender,
        createdAt: s.message.createdAt.toISOString(),
      })),
      hasMore,
      cursor: nextCursor,
    });
  });
}
