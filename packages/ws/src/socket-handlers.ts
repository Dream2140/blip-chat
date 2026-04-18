import type { Server, Socket } from "socket.io";
import type { Redis } from "ioredis";
import { SocketEvents, RedisChannels } from "@chat-app/shared";

export function registerSocketHandlers(
  io: Server,
  socket: Socket,
  redis: Redis
): void {
  const userId = socket.data.userId as string;

  // Publish online status
  redis.publish(
    RedisChannels.PRESENCE_EVENTS,
    JSON.stringify({
      event: SocketEvents.USER_ONLINE,
      data: { userId },
    })
  );

  // Broadcast to all connected clients
  socket.broadcast.emit(SocketEvents.USER_ONLINE, { userId });

  // Join conversation rooms
  socket.on(SocketEvents.JOIN_CONVERSATIONS, ({ conversationIds }) => {
    for (const id of conversationIds) {
      socket.join(`conversation:${id}`);
    }
  });

  // Typing indicators
  socket.on(SocketEvents.TYPING_START, ({ conversationId }) => {
    socket
      .to(`conversation:${conversationId}`)
      .emit(SocketEvents.USER_TYPING, { conversationId, userId });
  });

  socket.on(SocketEvents.TYPING_STOP, ({ conversationId }) => {
    socket
      .to(`conversation:${conversationId}`)
      .emit(SocketEvents.USER_STOP_TYPING, { conversationId, userId });
  });

  // Read receipts — publish to Redis for akane-web to persist
  socket.on(SocketEvents.MESSAGES_READ, ({ conversationId, lastMessageId }) => {
    redis.publish(
      RedisChannels.READ_RECEIPT_EVENTS,
      JSON.stringify({
        event: SocketEvents.MESSAGE_READ,
        data: { conversationId, userId, lastReadMessageId: lastMessageId },
      })
    );

    // Also broadcast to conversation participants
    socket
      .to(`conversation:${conversationId}`)
      .emit(SocketEvents.MESSAGE_READ, {
        conversationId,
        userId,
        lastReadMessageId: lastMessageId,
      });
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${userId}`);
    const lastSeenAt = new Date().toISOString();

    redis.publish(
      RedisChannels.PRESENCE_EVENTS,
      JSON.stringify({
        event: SocketEvents.USER_OFFLINE,
        data: { userId, lastSeenAt },
      })
    );

    socket.broadcast.emit(SocketEvents.USER_OFFLINE, { userId, lastSeenAt });
  });
}
