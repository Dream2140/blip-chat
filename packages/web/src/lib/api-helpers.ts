import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "./auth";

export interface AuthenticatedRequest {
  userId: string;
  nickname: string;
}

export async function withAuth(
  request: NextRequest,
  handler: (
    req: NextRequest,
    auth: AuthenticatedRequest
  ) => Promise<NextResponse>
): Promise<NextResponse> {
  const token = request.cookies.get("access_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = verifyAccessToken(token);
    return handler(request, {
      userId: payload.sub,
      nickname: payload.nickname,
    });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
