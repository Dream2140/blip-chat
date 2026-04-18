"use client";

import { useEffect, useState } from "react";
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

  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId);
  const setMessages = useChatStore((s) => s.setMessages);
  const conversations = useChatStore((s) => s.conversations);
  const updateConversation = useChatStore((s) => s.updateConversation);
  const addConversation = useChatStore((s) => s.addConversation);
  const messages = useChatStore(
    (s) => s.messagesByConversation[conversationId] || []
  );

  useEffect(() => {
    setActiveConversationId(conversationId);
    setLoading(true);
    setError("");

    // If conversation not in store, fetch it
    const convoInStore = conversations.find((c) => c.id === conversationId);
    const fetchConvo = convoInStore
      ? Promise.resolve()
      : fetch(`/api/conversations/${conversationId}`)
          .then((res) => {
            if (!res.ok) throw new Error("Conversation not found");
            return res.json();
          })
          .then((data) => {
            if (data?.conversation) {
              addConversation({
                ...data.conversation,
                lastMessage: null,
                unreadCount: 0,
              });
            }
          });

    // Fetch messages
    const fetchMessages = fetch(
      `/api/conversations/${conversationId}/messages?limit=50`
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load messages");
        return res.json();
      })
      .then((data) => {
        if (data?.items) {
          setMessages(conversationId, data.items);
        }
      });

    Promise.all([fetchConvo, fetchMessages])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    return () => {
      setActiveConversationId(null);
    };
  }, [conversationId, setActiveConversationId, setMessages, addConversation, conversations, updateConversation]);

  if (error) {
    return (
      <div
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          color: "var(--ink-3)",
          fontSize: 14,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>😕</div>
          <div style={{ fontWeight: 600, color: "var(--ink)" }}>{error}</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 12,
              background: "var(--primary)",
              color: "var(--primary-ink)",
              padding: "8px 20px",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            try again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          color: "var(--ink-3)",
          fontSize: 13,
        }}
      >
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
