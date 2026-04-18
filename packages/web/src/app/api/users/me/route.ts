import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import { updateProfileSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  return withAuth(request, async (_req, auth) => {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  });
}

export async function PATCH(request: NextRequest) {
  return withAuth(request, async (req, auth) => {
    const body = await req.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    if (result.data.nickname) {
      const existing = await prisma.user.findFirst({
        where: {
          nickname: result.data.nickname,
          NOT: { id: auth.userId },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Nickname already taken" },
          { status: 409 }
        );
      }
    }

    const user = await prisma.user.update({
      where: { id: auth.userId },
      data: result.data,
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  });
}
