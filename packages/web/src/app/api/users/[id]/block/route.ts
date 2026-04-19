import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/users/[id]/block — block a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (_req, auth) => {
    if (!rateLimit(`block:${auth.userId}`, 10)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id: blockedId } = await params;

    if (blockedId === auth.userId) {
      return NextResponse.json(
        { error: "Cannot block yourself" },
        { status: 400 }
      );
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create block record (upsert to avoid duplicate errors)
    await prisma.block.upsert({
      where: {
        blockerId_blockedId: {
          blockerId: auth.userId,
          blockedId,
        },
      },
      create: {
        blockerId: auth.userId,
        blockedId,
      },
      update: {},
    });

    return NextResponse.json({ blocked: true });
  });
}

// DELETE /api/users/[id]/block — unblock a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (_req, auth) => {
    if (!rateLimit(`block:${auth.userId}`, 10)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id: blockedId } = await params;

    await prisma.block.deleteMany({
      where: {
        blockerId: auth.userId,
        blockedId,
      },
    });

    return NextResponse.json({ blocked: false });
  });
}

// GET /api/users/[id]/block — check if blocked
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (_req, auth) => {
    const { id: blockedId } = await params;

    const block = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: auth.userId,
          blockedId,
        },
      },
    });

    return NextResponse.json({ blocked: !!block });
  });
}
