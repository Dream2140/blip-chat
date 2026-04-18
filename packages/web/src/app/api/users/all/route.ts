import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

// GET /api/users/all — list all users (for MVP discovery)
export async function GET(request: NextRequest) {
  return withAuth(request, async (_req, auth) => {
    const users = await prisma.user.findMany({
      where: {
        id: { not: auth.userId },
      },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        lastSeenAt: true,
        createdAt: true,
      },
      orderBy: { lastSeenAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ users });
  });
}
