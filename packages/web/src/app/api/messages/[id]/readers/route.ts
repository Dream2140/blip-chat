import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

// GET /api/messages/[id]/readers — returns users who have read up to this message
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (_req, auth) => {
    const { id } = await params;

    // Find the message
    const message = await prisma.message.findUnique({
      where: { id },
      select: { id: true, conversationId: true, senderId: true, createdAt: true },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Verify requesting user is a participant
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: { conversationId: message.conversationId, userId: auth.userId },
    });

    if (!isParticipant) {
      return NextResponse.json(
        { error: "Not a participant" },
        { status: 403 }
      );
    }

    // Single query: join participants with their last-read message to get createdAt
    const readers = await prisma.$queryRaw<
      Array<{ userId: string; nickname: string; avatarUrl: string | null; lastReadCreatedAt: Date | null }>
    >`
      SELECT cp."userId", u."nickname", u."avatarUrl", m."createdAt" AS "lastReadCreatedAt"
      FROM "ConversationParticipant" cp
      JOIN "User" u ON u."id" = cp."userId"
      LEFT JOIN "Message" m ON m."id" = cp."lastReadMessageId"
      WHERE cp."conversationId" = ${message.conversationId}
        AND cp."userId" != ${auth.userId}
        AND cp."lastReadMessageId" IS NOT NULL
    `;

    // Filter: only include readers whose lastReadMessage is >= target message
    const filteredReaders = readers.filter(
      (r) => r.lastReadCreatedAt && r.lastReadCreatedAt >= message.createdAt
    );

    return NextResponse.json({
      readers: filteredReaders.map((r) => ({
        userId: r.userId,
        nickname: r.nickname,
        avatarUrl: r.avatarUrl,
      })),
    });
  });
}
