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
  redis: Redis | null
): void {
  const userId = socket.data.userId as string;

  // Join user-specific room for targeted messaging
  socket.join(`user:${userId}`);

  // Publish online status
  if (redis) {
    redis.publish(
      RedisChannels.PRESENCE_EVENTS,
      JSON.stringify({
        event: SocketEvents.USER_ONLINE,
        data: { userId },
      })
    );
  }

  // Broadcast to all connected clients
  socket.broadcast.emit(SocketEvents.USER_ONLINE, { userId });

  // Join conversation rooms
  socket.on(SocketEvents.JOIN_CONVERSATIONS, ({ conversationIds }) => {
    try {
      // Basic validation
      if (!Array.isArray(conversationIds) || conversationIds.length > 100) {
        console.warn(`[Socket] ${userId} tried to join ${conversationIds?.length} rooms — rejected`);
        return;
      }
      for (const id of conversationIds) {
        if (typeof id === 'string' && id.length < 50) {
          socket.join(`conversation:${id}`);
        }
      }
    } catch (err) {
      console.error("[Socket] JOIN_CONVERSATIONS error:", err);
    }
  });

  // Typing indicators
  socket.on(SocketEvents.TYPING_START, ({ conversationId }) => {
    try {
      socket
        .to(`conversation:${conversationId}`)
        .emit(SocketEvents.USER_TYPING, { conversationId, userId });
    } catch (err) {
      console.error("[Socket] TYPING_START error:", err);
    }
  });

  socket.on(SocketEvents.TYPING_STOP, ({ conversationId }) => {
    try {
      socket
        .to(`conversation:${conversationId}`)
        .emit(SocketEvents.USER_STOP_TYPING, { conversationId, userId });
    } catch (err) {
      console.error("[Socket] TYPING_STOP error:", err);
    }
  });

  // Read receipts — publish to Redis for akane-web to persist
  socket.on(SocketEvents.MESSAGES_READ, ({ conversationId, lastMessageId }) => {
    try {
      if (redis) {
        redis.publish(
          RedisChannels.READ_RECEIPT_EVENTS,
          JSON.stringify({
            event: SocketEvents.MESSAGE_READ,
            data: { conversationId, userId, lastReadMessageId: lastMessageId },
          })
        );
      }

      // Also broadcast to conversation participants
      socket
        .to(`conversation:${conversationId}`)
        .emit(SocketEvents.MESSAGE_READ, {
          conversationId,
          userId,
          lastReadMessageId: lastMessageId,
        });
    } catch (err) {
      console.error("[Socket] MESSAGES_READ error:", err);
    }
  });

  // Delivery acknowledgments — forward to the original sender
  socket.on(SocketEvents.MESSAGE_DELIVERED, ({ messageId, conversationId, senderId }) => {
    try {
      io.to(`user:${senderId}`).emit(SocketEvents.MESSAGE_DELIVERED, {
        messageId,
        conversationId,
      });
    } catch (err) {
      console.error("[Socket] MESSAGE_DELIVERED error:", err);
    }
  });

  // Call signaling — use rooms (works across Redis-connected instances)
  socket.on(SocketEvents.CALL_INITIATE, ({ targetUserId }) => {
    try {
      console.log(`[Call] ${userId} → ${targetUserId} (initiate)`);
      io.to(`user:${targetUserId}`).emit(SocketEvents.CALL_INITIATE, {
        callerId: userId,
        callerNickname: socket.data.nickname,
      });
    } catch (err) {
      console.error("[Socket] CALL_INITIATE error:", err);
    }
  });

  socket.on(SocketEvents.CALL_ACCEPT, ({ targetUserId }) => {
    try {
      io.to(`user:${targetUserId}`).emit(SocketEvents.CALL_ACCEPT, { userId });
    } catch (err) {
      console.error("[Socket] CALL_ACCEPT error:", err);
    }
  });

  socket.on(SocketEvents.CALL_REJECT, ({ targetUserId }) => {
    try {
      io.to(`user:${targetUserId}`).emit(SocketEvents.CALL_REJECT, { userId });
    } catch (err) {
      console.error("[Socket] CALL_REJECT error:", err);
    }
  });

  socket.on(SocketEvents.CALL_END, ({ targetUserId }) => {
    try {
      io.to(`user:${targetUserId}`).emit(SocketEvents.CALL_END, { userId });
    } catch (err) {
      console.error("[Socket] CALL_END error:", err);
    }
  });

  socket.on(SocketEvents.CALL_OFFER, ({ targetUserId, sdp }) => {
    try {
      io.to(`user:${targetUserId}`).emit(SocketEvents.CALL_OFFER, { sdp });
    } catch (err) {
      console.error("[Socket] CALL_OFFER error:", err);
    }
  });

  socket.on(SocketEvents.CALL_ANSWER, ({ targetUserId, sdp }) => {
    try {
      io.to(`user:${targetUserId}`).emit(SocketEvents.CALL_ANSWER, { sdp });
    } catch (err) {
      console.error("[Socket] CALL_ANSWER error:", err);
    }
  });

  socket.on(SocketEvents.CALL_ICE_CANDIDATE, ({ targetUserId, candidate }) => {
    try {
      io.to(`user:${targetUserId}`).emit(SocketEvents.CALL_ICE_CANDIDATE, { candidate });
    } catch (err) {
      console.error("[Socket] CALL_ICE_CANDIDATE error:", err);
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    try {
      console.log(`User disconnected: ${userId}`);
      const lastSeenAt = new Date().toISOString();

      if (redis) {
        redis.publish(
          RedisChannels.PRESENCE_EVENTS,
          JSON.stringify({
            event: SocketEvents.USER_OFFLINE,
            data: { userId, lastSeenAt },
          })
        );
      }

      socket.broadcast.emit(SocketEvents.USER_OFFLINE, { userId, lastSeenAt });
    } catch (err) {
      console.error("[Socket] disconnect error:", err);
    }
  });
}
