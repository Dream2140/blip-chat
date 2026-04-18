"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ConversationHeader } from "@/components/chat/ConversationHeader";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetched = useRef(false);

  const messages = useChatStore(
    (s) => s.messagesByConversation[conversationId] || []
  );

  useEffect(() => {
    useChatStore.getState().setActiveConversationId(conversationId);

    if (fetched.current) {
      setLoading(false);
      return;
    }
    fetched.current = true;

    // Ensure conversation is in store
    const hasConvo = useChatStore.getState().conversations.some((c) => c.id === conversationId);
    const promises: Promise<void>[] = [];

    if (!hasConvo) {
      promises.push(
        fetch(`/api/conversations/${conversationId}`)
          .then((res) => {
            if (!res.ok) throw new Error("Conversation not found");
            return res.json();
          })
          .then((data) => {
            if (data?.conversation) {
              useChatStore.getState().addConversation({
                ...data.conversation,
                lastMessage: null,
                unreadCount: 0,
              });
            }
          })
      );
    }

    promises.push(
      fetch(`/api/conversations/${conversationId}/messages?limit=50`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load messages");
          return res.json();
        })
        .then((data) => {
          if (data?.items) {
            useChatStore.getState().setMessages(conversationId, data.items);
          }
        })
    );

    Promise.all(promises)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    return () => {
      useChatStore.getState().setActiveConversationId(null);
    };
  }, [conversationId]);

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
