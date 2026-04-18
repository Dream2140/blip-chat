import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { rotateRefreshToken, setAuthCookies, clearAuthCookies } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const oldToken = cookieStore.get("refresh_token")?.value;

    if (!oldToken) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }

    const result = await rotateRefreshToken(oldToken);

    if (!result) {
      clearAuthCookies(cookieStore);
      return NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 401 }
      );
    }

    setAuthCookies(cookieStore, result.accessToken, result.refreshToken);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
