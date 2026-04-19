import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  signAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from "@/lib/auth";
import { registerSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!rateLimit(`register:${ip}`, 5)) {
      return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });
    }

    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, nickname } = result.data;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { nickname }] },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Registration failed — please try different credentials" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { email, passwordHash, nickname },
    });

    const accessToken = signAccessToken(user.id, user.nickname);
    const refreshToken = await generateRefreshToken(user.id);

    const cookieStore = await cookies();
    setAuthCookies(cookieStore, accessToken, refreshToken);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        lastSeenAt: user.lastSeenAt.toISOString(),
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
