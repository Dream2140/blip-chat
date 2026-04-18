"use client";

import { useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { SocketEvents } from "@chat-app/shared";
import type { ServerToClientEvents, ClientToServerEvents } from "@chat-app/shared";
import { useChatStore } from "@/stores/chat-store";
import { apiFetch } from "@/lib/api-client";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "wss://blip-chat-ws.fly.dev";

// Module-level refs — shared across all useSocket() instances
let globalSocket: TypedSocket | null = null;

export function getGlobalSocket() {
  return globalSocket;
}
let globalConnecting = false;

export function useSocket() {
  const isConnected = useChatStore((s) => s.socketConnected);

  const connect = useCallback(async () => {
    if (globalSocket?.connected || globalConnecting) return;
    globalConnecting = true;

    try {
      // Use apiFetch for token refresh support
      const res = await apiFetch("/api/auth/socket-token", { method: "POST" });
      if (!res.ok) {
        globalConnecting = false;
        return;
      }
      const { token } = await res.json();

      const socket: TypedSocket = io(WS_URL, {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 15000,
        reconnectionAttempts: 5,
      });

      console.log("[Socket] connecting to", WS_URL);

      socket.on("connect", () => {
        console.log("[Socket] connected ✓");
        useChatStore.getState().setSocketConnected(true);
        const conversationIds = useChatStore.getState().conversations.map((c) => c.id);
        if (conversationIds.length > 0) {
          socket.emit(SocketEvents.JOIN_CONVERSATIONS, { conversationIds });
        }
      });

      socket.on("disconnect", (reason) => {
        console.log("[Socket] disconnected:", reason);
        useChatStore.getState().setSocketConnected(false);
      });

      socket.on("connect_error", (err) => {
        console.error("[Socket] connect error:", err.message);
        useChatStore.getState().setSocketConnected(false);
      });

      // MESSAGE_NEW — skip own messages (sender has optimistic update already)
      socket.on(SocketEvents.MESSAGE_NEW, (data) => {
        const currentUserId = useChatStore.getState().currentUser?.id;
        if (data.senderId === currentUserId) return; // sender already has it

        // Also dedup by ID
        const existing = useChatStore.getState().messagesByConversation[data.conversationId];
        if (existing?.some((m) => m.id === data.id)) return;

        useChatStore.getState().addMessage(data.conversationId, {
          id: data.id,
          conversationId: data.conversationId,
          senderId: data.senderId,
          sender: {} as never,
          text: data.text,
          replyToId: data.replyToId,
          replyTo: null,
          editedAt: null,
          deletedAt: null,
          createdAt: data.createdAt,
          status: "delivered",
          reactions: [],
        });
      });

      socket.on(SocketEvents.MESSAGE_UPDATED, (data) => {
        useChatStore.getState().updateMessage(data.conversationId, data.id, {
          text: data.text,
          editedAt: data.editedAt,
        });
      });

      socket.on(SocketEvents.MESSAGE_DELETED, (data) => {
        useChatStore.getState().removeMessage(data.conversationId, data.id);
      });

      socket.on(SocketEvents.USER_ONLINE, (data) => {
        useChatStore.getState().setUserOnline(data.userId);
      });

      socket.on(SocketEvents.USER_OFFLINE, (data) => {
        useChatStore.getState().setUserOffline(data.userId);
      });

      socket.on(SocketEvents.USER_TYPING, (data) => {
        useChatStore.getState().setUserTyping(data.conversationId, data.userId);
      });

      socket.on(SocketEvents.USER_STOP_TYPING, (data) => {
        useChatStore.getState().clearUserTyping(data.conversationId, data.userId);
      });

      socket.on(SocketEvents.CONVERSATION_CREATED, (data) => {
        useChatStore.getState().addConversation({
          id: data.id,
          type: data.type,
          name: data.name,
          avatarUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          participants: [],
          lastMessage: null,
          unreadCount: 0,
        });
      });

      // ── Call signaling events ── direct module-level handlers, no window hacks
      socket.on("call:initiate" as never, ((data: { callerId: string; callerNickname: string }) => {
        console.log("[Socket] call:initiate from", data.callerNickname);
        useChatStore.getState().receiveCall(data.callerId, data.callerNickname);
      }) as never);

      socket.on("call:accept" as never, (() => {
        console.log("[Socket] call:accept received");
        useChatStore.getState().acceptCall();
        // Caller side: start WebRTC offer
        const targetId = useChatStore.getState().callRemoteUserId;
        if (targetId) {
          import("@/hooks/useWebRTC").then(({ webrtcStartOffer }) => {
            webrtcStartOffer(targetId);
          });
        }
      }) as never);

      socket.on("call:reject" as never, (() => {
        console.log("[Socket] call:reject");
        import("@/hooks/useWebRTC").then(({ webrtcCleanup }) => webrtcCleanup());
      }) as never);

      socket.on("call:end" as never, (() => {
        console.log("[Socket] call:end");
        import("@/hooks/useWebRTC").then(({ webrtcCleanup }) => webrtcCleanup());
      }) as never);

      socket.on("call:offer" as never, ((data: { sdp: string }) => {
        console.log("[Socket] call:offer received");
        const callerId = useChatStore.getState().callRemoteUserId;
        if (callerId) {
          import("@/hooks/useWebRTC").then(({ webrtcHandleOffer }) => {
            webrtcHandleOffer(callerId, data.sdp);
          });
        }
      }) as never);

      socket.on("call:answer" as never, ((data: { sdp: string }) => {
        console.log("[Socket] call:answer received");
        import("@/hooks/useWebRTC").then(({ webrtcHandleAnswer }) => {
          webrtcHandleAnswer(data.sdp);
        });
      }) as never);

      socket.on("call:ice_candidate" as never, ((data: { candidate: string }) => {
        import("@/hooks/useWebRTC").then(({ webrtcHandleIceCandidate }) => {
          webrtcHandleIceCandidate(data.candidate);
        });
      }) as never);

      globalSocket = socket;
    } catch (err) {
      console.error("[Socket] connection failed:", err);
    } finally {
      globalConnecting = false;
    }
  }, []);

  const disconnect = useCallback(() => {
    globalSocket?.disconnect();
    globalSocket = null;
    useChatStore.getState().setSocketConnected(false);
  }, []);

  const emitTypingStart = useCallback((conversationId: string) => {
    globalSocket?.emit(SocketEvents.TYPING_START, { conversationId });
  }, []);

  const emitTypingStop = useCallback((conversationId: string) => {
    globalSocket?.emit(SocketEvents.TYPING_STOP, { conversationId });
  }, []);

  const emitMessagesRead = useCallback(
    (conversationId: string, lastMessageId: string) => {
      globalSocket?.emit(SocketEvents.MESSAGES_READ, {
        conversationId,
        lastMessageId,
      });
      apiFetch(`/api/conversations/${conversationId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastMessageId }),
      }).catch(() => {});
    },
    []
  );

  const getSocket = useCallback(() => globalSocket, []);

  return {
    connect,
    disconnect,
    isConnected,
    emitTypingStart,
    emitTypingStop,
    emitMessagesRead,
    getSocket,
  };
}
