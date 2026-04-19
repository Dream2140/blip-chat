import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { clearAuthCookies } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (refreshToken) {
      await prisma.refreshToken
        .delete({ where: { token: refreshToken } })
        .catch((err) => console.error("[logout] delete refresh token failed:", err));
    }

    clearAuthCookies(cookieStore);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
