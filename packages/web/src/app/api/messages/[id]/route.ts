import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import { editMessageSchema } from "@/lib/validators";
import { publishMessageEvent } from "@/lib/redis";
import { SocketEvents } from "@chat-app/shared";

// PATCH /api/messages/[id] — edit message
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, auth) => {
    const { id } = await params;
    const body = await req.json();
    const result = editMessageSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const message = await prisma.message.findFirst({
      where: { id, senderId: auth.userId, deletedAt: null },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found or not yours" },
        { status: 404 }
      );
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { text: result.data.text, editedAt: new Date() },
    });

    await publishMessageEvent(SocketEvents.MESSAGE_UPDATED, {
      id: updated.id,
      conversationId: updated.conversationId,
      text: updated.text,
      editedAt: updated.editedAt!.toISOString(),
    });

    return NextResponse.json({ message: updated });
  });
}

// DELETE /api/messages/[id] — soft delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (_req, auth) => {
    const { id } = await params;

    const message = await prisma.message.findFirst({
      where: { id, senderId: auth.userId, deletedAt: null },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found or not yours" },
        { status: 404 }
      );
    }

    await prisma.message.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await publishMessageEvent(SocketEvents.MESSAGE_DELETED, {
      id: message.id,
      conversationId: message.conversationId,
    });

    return NextResponse.json({ success: true });
  });
}
