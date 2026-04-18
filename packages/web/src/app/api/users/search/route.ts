import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth) => {
    const q = req.nextUrl.searchParams.get("q");

    if (!q || q.length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: auth.userId } },
          {
            OR: [
              { nickname: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
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
      take: 20,
      orderBy: { nickname: "asc" },
    });

    return NextResponse.json({ users });
  });
}
