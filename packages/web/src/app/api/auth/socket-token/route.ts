import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { signSocketToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  return withAuth(request, async (_req, auth) => {
    const token = signSocketToken(auth.userId, auth.nickname);
    return NextResponse.json({ token });
  });
}
