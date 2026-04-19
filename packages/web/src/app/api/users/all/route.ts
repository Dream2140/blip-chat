import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

// GET /api/users/all — list all users with cursor pagination
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth) => {
    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") || "20", 10) || 20,
      50
    );

    const users = await prisma.user.findMany({
      where: { id: { not: auth.userId } },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        lastSeenAt: true,
        createdAt: true,
      },
      orderBy: { lastSeenAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = users.length > limit;
    const items = hasMore ? users.slice(0, limit) : users;

    return NextResponse.json({
      users: items,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  });
}
