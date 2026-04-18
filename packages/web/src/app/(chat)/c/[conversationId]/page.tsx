"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { apiFetch } from "@/lib/api-client";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ConversationHeader } from "@/components/chat/ConversationHeader";
import type { Message } from "@chat-app/shared";

// CRITICAL: stable empty reference — `|| []` inside a Zustand selector
// creates a new array each render, causing Object.is to fail → infinite re-render
const EMPTY_MESSAGES: Message[] = [];

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const messages = useChatStore(
    (s) => s.messagesByConversation[conversationId] ?? EMPTY_MESSAGES
  );

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/messages?limit=50`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data?.items) {
        useChatStore.getState().setMessages(conversationId, data.items);
      }
    } catch {}
  }, [conversationId]);

  useEffect(() => {
    useChatStore.getState().setActiveConversationId(conversationId);
    setLoading(true);
    setError("");

    async function init() {
      try {
        const hasConvo = useChatStore
          .getState()
          .conversations.some((c) => c.id === conversationId);

        if (!hasConvo) {
          const res = await apiFetch(`/api/conversations/${conversationId}`);
          if (!res.ok) throw new Error("Conversation not found");
          const data = await res.json();
          if (data?.conversation) {
            useChatStore.getState().addConversation({
              ...data.conversation,
              lastMessage: null,
              unreadCount: 0,
            });
          }
        }

        await fetchMessages();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    init();

    return () => {
      useChatStore.getState().setActiveConversationId(null);
    };
  }, [conversationId, fetchMessages]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  if (error) {
    return (
      <div style={{ flex: 1, display: "grid", placeItems: "center", color: "var(--ink-3)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>😕</div>
          <div style={{ fontWeight: 600, color: "var(--ink)" }}>{error}</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: "grid", placeItems: "center", color: "var(--ink-3)", fontSize: 13 }}>
        loading…
      </div>
    );
  }

  return (
    <>
      <ConversationHeader conversationId={conversationId} />
      <MessageList conversationId={conversationId} messages={messages} />
      <MessageInput conversationId={conversationId} />
    </>
  );
}
