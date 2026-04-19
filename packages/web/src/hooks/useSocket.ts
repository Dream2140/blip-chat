"use client";

import { useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { SocketEvents } from "@chat-app/shared";
import type { ServerToClientEvents, ClientToServerEvents } from "@chat-app/shared";
import { useAuthStore } from "@/stores/auth-store";
import { useConversationStore } from "@/stores/conversation-store";
import { useLiveStore } from "@/stores/live-store";
import { apiFetch } from "@/lib/api-client";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "wss://blip-chat-ws.fly.dev";

// Module-level refs — shared across all useSocket() instances
let globalSocket: TypedSocket | null = null;
let lastEventTimestamp: string = new Date().toISOString();
let wasConnectedBefore = false;

export function getGlobalSocket() {
  return globalSocket;
}
let globalConnecting = false;
let unloadListenerAdded = false;

// Sync missed events after reconnect
async function syncAfterReconnect() {
  try {
    const res = await apiFetch(`/api/sync?since=${encodeURIComponent(lastEventTimestamp)}`);
    if (!res.ok) return;
    const data = await res.json();

    const currentUserId = useAuthStore.getState().currentUser?.id;
    const store = useConversationStore.getState();

    // Add new messages (skip own — already have via optimistic)
    for (const msg of data.messages || []) {
      if (msg.senderId === currentUserId) continue;
      const existing = store.messagesByConversation[msg.conversationId];
      if (existing?.some((m: { id: string }) => m.id === msg.id)) continue;

      store.addMessage(msg.conversationId, {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        sender: { id: msg.senderId, nickname: msg.senderNickname, avatarUrl: null } as never,
        text: msg.text,
        replyToId: msg.replyToId || null,
        replyTo: null,
        editedAt: null,
        deletedAt: null,
        createdAt: msg.createdAt,
        status: "delivered",
        reactions: [],
      });
    }

    // Apply edits
    for (const edit of data.editedMessages || []) {
      store.updateMessage(edit.conversationId, edit.id, {
        text: edit.text,
        editedAt: edit.editedAt,
      });
    }

    // Apply deletes
    for (const del of data.deletedMessageIds || []) {
      store.removeMessage(del.conversationId, del.id);
    }

    // Update conversation aggregates
    for (const conv of data.conversations || []) {
      store.updateConversation(conv.id, {
        updatedAt: conv.updatedAt,
        lastMessage: conv.lastMessageId
          ? {
              id: conv.lastMessageId,
              conversationId: conv.id,
              senderId: conv.lastMessageSenderId || "",
              sender: { id: conv.lastMessageSenderId || "", nickname: "", avatarUrl: null } as never,
              text: conv.lastMessagePreview || "",
              replyToId: null,
              replyTo: null,
              editedAt: null,
              deletedAt: null,
              createdAt: conv.lastMessageAt || conv.updatedAt,
              status: "sent" as const,
            }
          : undefined,
      });
    }

    console.log(
      `[Sync] reconnect sync: ${(data.messages || []).length} new msgs, ${(data.editedMessages || []).length} edits, ${(data.deletedMessageIds || []).length} deletes`
    );
  } catch (err) {
    console.error("[Sync] reconnect sync failed:", err);
  }
}

export function useSocket() {
  const isConnected = useLiveStore((s) => s.socketConnected);

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
        useLiveStore.getState().setSocketConnected(true);
        const conversationIds = useConversationStore.getState().conversations.map((c) => c.id);
        if (conversationIds.length > 0) {
          socket.emit(SocketEvents.JOIN_CONVERSATIONS, { conversationIds });
        }
        // Sync missed events on reconnect (not first connect)
        if (wasConnectedBefore) {
          syncAfterReconnect();
        }
        wasConnectedBefore = true;
      });

      socket.on("disconnect", (reason) => {
        console.log("[Socket] disconnected:", reason);
        lastEventTimestamp = new Date().toISOString();
        useLiveStore.getState().setSocketConnected(false);
      });

      socket.on("connect_error", (err) => {
        console.error("[Socket] connect error:", err.message);
        useLiveStore.getState().setSocketConnected(false);
      });

      // MESSAGE_NEW — skip own messages (sender has optimistic update already)
      socket.on(SocketEvents.MESSAGE_NEW, (data) => {
        // Track latest event time for reconnect sync
        if (data.createdAt) lastEventTimestamp = data.createdAt;

        const currentUserId = useAuthStore.getState().currentUser?.id;
        if (data.senderId === currentUserId) return; // sender already has it

        // Also dedup by ID
        const existing = useConversationStore.getState().messagesByConversation[data.conversationId];
        if (existing?.some((m) => m.id === data.id)) return;

        useConversationStore.getState().addMessage(data.conversationId, {
          id: data.id,
          conversationId: data.conversationId,
          senderId: data.senderId,
          sender: { id: data.senderId, nickname: "", avatarUrl: null } as never,
          text: data.text,
          replyToId: data.replyToId,
          replyTo: null,
          editedAt: null,
          deletedAt: null,
          createdAt: data.createdAt,
          status: "delivered",
          reactions: [],
        });

        // Send delivery acknowledgment back to the sender
        socket.emit(SocketEvents.MESSAGE_DELIVERED, {
          messageId: data.id,
          conversationId: data.conversationId,
          senderId: data.senderId,
        });

        // Increment unread count if this conversation is not currently active
        const activeId = useConversationStore.getState().activeConversationId;
        if (data.conversationId !== activeId) {
          useConversationStore.getState().incrementUnread(data.conversationId);

          // Update document title with new total unread count
          const totalUnread = useConversationStore.getState().conversations.reduce(
            (sum, c) => sum + (c.unreadCount ?? 0),
            0
          );
          const newTitle = totalUnread > 0 ? `(${totalUnread}) blip` : "blip";
          if (document.title !== newTitle) document.title = newTitle;
        }
      });

      socket.on(SocketEvents.MESSAGE_UPDATED, (data) => {
        useConversationStore.getState().updateMessage(data.conversationId, data.id, {
          text: data.text,
          editedAt: data.editedAt,
        });
      });

      // Delivery confirmation — update sender's message status to "delivered"
      socket.on(SocketEvents.MESSAGE_DELIVERED, (data) => {
        const msg = useConversationStore.getState().messagesByConversation[data.conversationId]
          ?.find((m) => m.id === data.messageId);
        // Only upgrade to "delivered" if not already "read"
        if (msg && msg.status !== "read") {
          useConversationStore.getState().updateMessage(data.conversationId, data.messageId, {
            status: "delivered",
          });
        }
      });

      socket.on(SocketEvents.MESSAGE_DELETED, (data) => {
        useConversationStore.getState().removeMessage(data.conversationId, data.id);
      });

      socket.on(SocketEvents.USER_ONLINE, (data) => {
        useLiveStore.getState().setUserOnline(data.userId);
      });

      socket.on(SocketEvents.USER_OFFLINE, (data) => {
        useLiveStore.getState().setUserOffline(data.userId);
      });

      socket.on(SocketEvents.USER_TYPING, (data) => {
        useLiveStore.getState().setUserTyping(data.conversationId, data.userId);
      });

      socket.on(SocketEvents.USER_STOP_TYPING, (data) => {
        useLiveStore.getState().clearUserTyping(data.conversationId, data.userId);
      });

      socket.on(SocketEvents.CONVERSATION_CREATED, (data) => {
        useConversationStore.getState().addConversation({
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
        useLiveStore.getState().receiveCall(data.callerId, data.callerNickname);
      }) as never);

      socket.on("call:accept" as never, (() => {
        console.log("[Socket] call:accept received");
        useLiveStore.getState().acceptCall();
        // Caller side: start WebRTC offer
        const targetId = useLiveStore.getState().callRemoteUserId;
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
        const callerId = useLiveStore.getState().callRemoteUserId;
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

      // Clean disconnect on page unload to avoid dangling connections
      if (typeof window !== "undefined" && !unloadListenerAdded) {
        unloadListenerAdded = true;
        window.addEventListener("beforeunload", () => {
          globalSocket?.disconnect();
        });
      }
    } catch (err) {
      console.error("[Socket] connection failed:", err);
    } finally {
      globalConnecting = false;
    }
  }, []);

  const disconnect = useCallback(() => {
    globalSocket?.disconnect();
    globalSocket = null;
    lastEventTimestamp = new Date().toISOString();
    wasConnectedBefore = false;
    useLiveStore.getState().setSocketConnected(false);
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
      }).catch((err) => console.error("[useSocket] mark-read failed:", err));
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
