import type { Server, Socket } from "socket.io";
import type { Redis } from "ioredis";
import { SocketEvents, RedisChannels } from "@chat-app/shared";

function findSocketByUserId(io: Server, userId: string): Socket | undefined {
  for (const [, s] of io.sockets.sockets) {
    if (s.data.userId === userId) return s;
  }
  return undefined;
}

export function registerSocketHandlers(
  io: Server,
  socket: Socket,
  redis: Redis
): void {
  const userId = socket.data.userId as string;

  // Join user-specific room for targeted messaging
  socket.join(`user:${userId}`);

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

  // Call signaling — use rooms (works across Redis-connected instances)
  socket.on(SocketEvents.CALL_INITIATE, ({ targetUserId }) => {
    io.to(`user:${targetUserId}`).emit(SocketEvents.CALL_INITIATE, {
      callerId: userId,
      callerNickname: socket.data.nickname,
    });
  });

  socket.on(SocketEvents.CALL_ACCEPT, ({ targetUserId }) => {
    io.to(`user:${targetUserId}`).emit(SocketEvents.CALL_ACCEPT, { userId });
  });

  socket.on(SocketEvents.CALL_REJECT, ({ targetUserId }) => {
    io.to(`user:${targetUserId}`).emit(SocketEvents.CALL_REJECT, { userId });
  });

  socket.on(SocketEvents.CALL_END, ({ targetUserId }) => {
    io.to(`user:${targetUserId}`).emit(SocketEvents.CALL_END, { userId });
  });

  socket.on(SocketEvents.CALL_OFFER, ({ targetUserId, sdp }) => {
    io.to(`user:${targetUserId}`).emit(SocketEvents.CALL_OFFER, { sdp });
  });

  socket.on(SocketEvents.CALL_ANSWER, ({ targetUserId, sdp }) => {
    io.to(`user:${targetUserId}`).emit(SocketEvents.CALL_ANSWER, { sdp });
  });

  socket.on(SocketEvents.CALL_ICE_CANDIDATE, ({ targetUserId, candidate }) => {
    io.to(`user:${targetUserId}`).emit(SocketEvents.CALL_ICE_CANDIDATE, { candidate });
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
