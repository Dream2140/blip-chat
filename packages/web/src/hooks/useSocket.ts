"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { SocketEvents } from "@chat-app/shared";
import type { ServerToClientEvents, ClientToServerEvents } from "@chat-app/shared";
import { useChatStore } from "@/stores/chat-store";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

export function useSocket() {
  const socketRef = useRef<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const {
    addMessage,
    updateMessage,
    removeMessage,
    setUserOnline,
    setUserOffline,
    setUserTyping,
    clearUserTyping,
    addConversation,
    conversations,
  } = useChatStore();

  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return;

    try {
      const res = await fetch("/api/auth/socket-token", { method: "POST" });
      if (!res.ok) return;
      const { token } = await res.json();

      const socket: TypedSocket = io(WS_URL, {
        auth: { token },
        transports: ["websocket"],
      });

      socket.on("connect", () => {
        setIsConnected(true);
        // Join all conversation rooms
        const conversationIds = useChatStore.getState().conversations.map((c) => c.id);
        if (conversationIds.length > 0) {
          socket.emit(SocketEvents.JOIN_CONVERSATIONS, { conversationIds });
        }
      });

      socket.on("disconnect", () => {
        setIsConnected(false);
      });

      // Message events
      socket.on(SocketEvents.MESSAGE_NEW, (data) => {
        addMessage(data.conversationId, {
          id: data.id,
          conversationId: data.conversationId,
          senderId: data.senderId,
          sender: {} as never, // Will be populated by re-fetch or cache
          text: data.text,
          replyToId: data.replyToId,
          replyTo: null,
          editedAt: null,
          deletedAt: null,
          createdAt: data.createdAt,
          status: "delivered",
        });
      });

      socket.on(SocketEvents.MESSAGE_UPDATED, (data) => {
        updateMessage(data.conversationId, data.id, {
          text: data.text,
          editedAt: data.editedAt,
        });
      });

      socket.on(SocketEvents.MESSAGE_DELETED, (data) => {
        removeMessage(data.conversationId, data.id);
      });

      socket.on(SocketEvents.MESSAGE_READ, (data) => {
        // Update messages as read in the conversation
        const messages = useChatStore.getState().messagesByConversation[data.conversationId] || [];
        for (const msg of messages) {
          if (msg.senderId !== data.userId && msg.createdAt <= data.lastReadMessageId) {
            updateMessage(data.conversationId, msg.id, { status: "read" });
          }
        }
      });

      // Presence
      socket.on(SocketEvents.USER_ONLINE, (data) => {
        setUserOnline(data.userId);
      });

      socket.on(SocketEvents.USER_OFFLINE, (data) => {
        setUserOffline(data.userId);
      });

      // Typing
      socket.on(SocketEvents.USER_TYPING, (data) => {
        setUserTyping(data.conversationId, data.userId);
      });

      socket.on(SocketEvents.USER_STOP_TYPING, (data) => {
        clearUserTyping(data.conversationId, data.userId);
      });

      // New conversation
      socket.on(SocketEvents.CONVERSATION_CREATED, (data) => {
        addConversation({
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

      socketRef.current = socket;
    } catch (err) {
      console.error("Socket connection failed:", err);
    }
  }, [addMessage, updateMessage, removeMessage, setUserOnline, setUserOffline, setUserTyping, clearUserTyping, addConversation]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsConnected(false);
  }, []);

  // Join new conversation rooms when conversations change
  useEffect(() => {
    if (socketRef.current?.connected && conversations.length > 0) {
      socketRef.current.emit(SocketEvents.JOIN_CONVERSATIONS, {
        conversationIds: conversations.map((c) => c.id),
      });
    }
  }, [conversations]);

  const emitTypingStart = useCallback((conversationId: string) => {
    socketRef.current?.emit(SocketEvents.TYPING_START, { conversationId });
  }, []);

  const emitTypingStop = useCallback((conversationId: string) => {
    socketRef.current?.emit(SocketEvents.TYPING_STOP, { conversationId });
  }, []);

  const emitMessagesRead = useCallback(
    (conversationId: string, lastMessageId: string) => {
      socketRef.current?.emit(SocketEvents.MESSAGES_READ, {
        conversationId,
        lastMessageId,
      });

      // Also persist via API
      fetch(`/api/conversations/${conversationId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastMessageId }),
      }).catch(() => {});
    },
    []
  );

  return {
    connect,
    disconnect,
    isConnected,
    emitTypingStart,
    emitTypingStop,
    emitMessagesRead,
  };
}
