import type { Server } from "socket.io";
import type { Redis } from "ioredis";
import { SocketEvents, RedisChannels } from "@chat-app/shared";

interface RedisEvent {
  event: string;
  data: Record<string, unknown>;
}

export function subscribeToRedisEvents(io: Server, subscriber: Redis): void {
  subscriber.subscribe(RedisChannels.MESSAGE_EVENTS, (err) => {
    if (err) console.error("Failed to subscribe to message events:", err);
  });

  subscriber.on("message", (_channel: string, message: string) => {
    try {
      const { event, data } = JSON.parse(message) as RedisEvent;

      switch (event) {
        case SocketEvents.MESSAGE_NEW: {
          const conversationId = data.conversationId as string;
          io.to(`conversation:${conversationId}`).emit(
            SocketEvents.MESSAGE_NEW,
            data as Parameters<
              typeof io.emit<typeof SocketEvents.MESSAGE_NEW>
            >[1]
          );
          break;
        }

        case SocketEvents.MESSAGE_UPDATED: {
          const conversationId = data.conversationId as string;
          io.to(`conversation:${conversationId}`).emit(
            SocketEvents.MESSAGE_UPDATED,
            data as Parameters<
              typeof io.emit<typeof SocketEvents.MESSAGE_UPDATED>
            >[1]
          );
          break;
        }

        case SocketEvents.MESSAGE_DELETED: {
          const conversationId = data.conversationId as string;
          io.to(`conversation:${conversationId}`).emit(
            SocketEvents.MESSAGE_DELETED,
            data as Parameters<
              typeof io.emit<typeof SocketEvents.MESSAGE_DELETED>
            >[1]
          );
          break;
        }

        case SocketEvents.CONVERSATION_CREATED: {
          const participants = data.participants as Array<{
            userId: string;
          }>;
          for (const p of participants) {
            // Emit to all sockets of this user
            io.to(`user:${p.userId}`).emit(
              SocketEvents.CONVERSATION_CREATED,
              data as Parameters<
                typeof io.emit<typeof SocketEvents.CONVERSATION_CREATED>
              >[1]
            );
          }
          break;
        }
      }
    } catch (err) {
      console.error("Failed to process Redis message:", err);
    }
  });
}
