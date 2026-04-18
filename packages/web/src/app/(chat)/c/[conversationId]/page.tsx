"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { apiFetch } from "@/lib/api-client";
import { playNotificationSound } from "@/lib/notification-sound";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ConversationHeader } from "@/components/chat/ConversationHeader";
import type { Message } from "@chat-app/shared";

const EMPTY_MESSAGES: Message[] = [];

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const prevMessageCountRef = useRef<number>(0);

  const messages = useChatStore(
    (s) => s.messagesByConversation[conversationId] ?? EMPTY_MESSAGES
  );

  const fetchMessages = useCallback(async () => {
    try {
      const res = await apiFetch(
        `/api/conversations/${conversationId}/messages?limit=50`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data?.items) {
        const currentUserId = useChatStore.getState().currentUser?.id;
        const prevCount = prevMessageCountRef.current;
        const newCount = (data.items as Message[]).length;

        if (prevCount > 0 && newCount > prevCount && !document.hasFocus()) {
          const newMessages = (data.items as Message[]).slice(prevCount);
          const hasOtherUserMessage = newMessages.some(
            (m) => m.senderId !== currentUserId && !m.deletedAt
          );
          if (hasOtherUserMessage) {
            playNotificationSound();
          }
        }
        prevMessageCountRef.current = newCount;

        useChatStore.getState().setMessages(conversationId, data.items);

        // Mark as read: find the last message not sent by me
        const lastOtherMsg = [...data.items]
          .reverse()
          .find((m: Message) => m.senderId !== currentUserId && !m.deletedAt);
        if (lastOtherMsg) {
          apiFetch(`/api/conversations/${conversationId}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lastMessageId: lastOtherMsg.id }),
          }).catch(() => {});
        }
      }
    } catch {}
  }, [conversationId]);

  useEffect(() => {
    useChatStore.getState().setActiveConversationId(conversationId);
    setLoading(true);
    setError("");
    setReplyTo(null);

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
      <MessageList
        conversationId={conversationId}
        messages={messages}
        onReply={setReplyTo}
      />
      <MessageInput
        conversationId={conversationId}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
      />
    </>
  );
}
