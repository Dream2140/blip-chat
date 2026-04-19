"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useConversationStore } from "@/stores/conversation-store";
import { useLiveStore } from "@/stores/live-store";
import { apiFetch } from "@/lib/api-client";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ConversationHeader } from "@/components/chat/ConversationHeader";
import type { Message } from "@chat-app/shared";

const EMPTY_MESSAGES: Message[] = [];

export default function ConversationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const conversationId = params.conversationId as string;
  const highlightMessageId = searchParams.get("msg");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const markedReadRef = useRef(false);
  const isConnected = useLiveStore((s) => s.socketConnected);

  const messages = useConversationStore(
    (s) => s.messagesByConversation[conversationId] ?? EMPTY_MESSAGES
  );

  const fetchMessages = useCallback(async () => {
    try {
      const res = await apiFetch(
        `/api/conversations/${conversationId}/messages?limit=20`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data?.items) {
        useConversationStore.getState().setMessages(conversationId, data.items);

        // Mark as read ONCE when opening conversation
        if (!markedReadRef.current) {
          markedReadRef.current = true;
          const currentUserId = useAuthStore.getState().currentUser?.id;
          const lastOtherMsg = [...data.items]
            .reverse()
            .find((m: Message) => m.senderId !== currentUserId && !m.deletedAt);
          if (lastOtherMsg) {
            apiFetch(`/api/conversations/${conversationId}/read`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lastMessageId: lastOtherMsg.id }),
            }).catch((err) => console.error("[ConversationPage] mark-read failed:", err));
          }
        }
      }
    } catch (err) {
      console.error("[ConversationPage] fetch messages failed:", err);
    }
  }, [conversationId]);

  useEffect(() => {
    useConversationStore.getState().setActiveConversationId(conversationId);
    useConversationStore.getState().clearUnread(conversationId);

    // Update document title after clearing unread
    const totalUnread = useConversationStore.getState().conversations.reduce(
      (sum, c) => sum + (c.unreadCount ?? 0),
      0
    );
    document.title = totalUnread > 0 ? `(${totalUnread}) blip` : "blip";

    setLoading(true);
    setError("");
    setReplyTo(null);
    markedReadRef.current = false;

    async function init() {
      try {
        const hasConvo = useConversationStore
          .getState()
          .conversations.some((c) => c.id === conversationId);

        if (!hasConvo) {
          const res = await apiFetch(`/api/conversations/${conversationId}`);
          if (!res.ok) throw new Error("Conversation not found");
          const data = await res.json();
          if (data?.conversation) {
            useConversationStore.getState().addConversation({
              ...data.conversation,
              lastMessage: null,
              unreadCount: 0,
            });
          }
        }

        await fetchMessages();

        // If a specific message is targeted, check if it's loaded
        if (highlightMessageId) {
          const loaded = useConversationStore.getState().messagesByConversation[conversationId] ?? [];
          const found = loaded.some((m: Message) => m.id === highlightMessageId);
          if (!found) {
            // Fetch messages around the target
            const aroundRes = await apiFetch(
              `/api/conversations/${conversationId}/messages?around=${encodeURIComponent(highlightMessageId)}&limit=50`
            );
            if (aroundRes.ok) {
              const aroundData = await aroundRes.json();
              if (aroundData?.items) {
                useConversationStore.getState().setMessages(conversationId, aroundData.items);
              }
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    init();

    return () => {
      useConversationStore.getState().setActiveConversationId(null);
    };
  }, [conversationId, fetchMessages, highlightMessageId]);

  // Fallback poll ONLY when WebSocket is disconnected
  useEffect(() => {
    if (isConnected) return;
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [isConnected, fetchMessages]);

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
    return <MessageSkeletons />;
  }

  return (
    <>
      <ConversationHeader conversationId={conversationId} />
      <MessageList
        conversationId={conversationId}
        messages={messages}
        onReply={setReplyTo}
        highlightMessageId={highlightMessageId}
      />
      <MessageInput
        conversationId={conversationId}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
      />
    </>
  );
}

function MessageSkeletons() {
  return (
    <div className="messages" style={{ gap: 12, padding: "20px 24px" }}>
      {[...Array(6)].map((_, i) => (
        <div key={i} className={`msg-row ${i % 3 === 0 ? "me" : ""}`}>
          {i % 3 !== 0 && <div className="skeleton" style={{ width: 32, height: 32 }} />}
          <div className="msg-group">
            <div className="skeleton" style={{ width: 120 + (i * 30) % 140, height: 40, borderRadius: "var(--radius-bubble)" }} />
            <div className="skeleton" style={{ width: 60, height: 12 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
