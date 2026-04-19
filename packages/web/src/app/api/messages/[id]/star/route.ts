import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/messages/[id]/star — toggle star on/off
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (_req, auth) => {
    if (!rateLimit(`star:${auth.userId}`, 30)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id: messageId } = await params;

    const existing = await prisma.starredMessage.findUnique({
      where: { userId_messageId: { userId: auth.userId, messageId } },
    });

    if (existing) {
      await prisma.starredMessage.delete({ where: { id: existing.id } });
      return NextResponse.json({ starred: false });
    }

    await prisma.starredMessage.create({
      data: { userId: auth.userId, messageId },
    });
    return NextResponse.json({ starred: true });
  });
}
