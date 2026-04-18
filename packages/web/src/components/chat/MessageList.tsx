"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useChatStore } from "@/stores/chat-store";
import { apiFetch } from "@/lib/api-client";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "@chat-app/shared";

const EMPTY_MESSAGES: Message[] = [];

interface MessageListProps {
  conversationId: string;
  messages: Message[];
  onReply?: (message: Message) => void;
}

export function MessageList({ conversationId, messages, onReply }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentUser = useChatStore((s) => s.currentUser);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastMsgId = useRef<string | null>(null);
  const didInitialScroll = useRef(false);

  // Auto-scroll: only on genuinely new messages, using container scrollTop (not scrollIntoView)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const newestId = messages.length > 0 ? messages[messages.length - 1].id : null;
    const isNewMessage = newestId !== lastMsgId.current;
    lastMsgId.current = newestId;

    if (!isNewMessage && didInitialScroll.current) return;

    // Initial load — always scroll to bottom
    if (!didInitialScroll.current) {
      didInitialScroll.current = true;
      el.scrollTop = el.scrollHeight;
      return;
    }

    // New message — only scroll if already near bottom
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Reset initial scroll flag when conversation changes
  useEffect(() => {
    didInitialScroll.current = false;
  }, [conversationId]);

  // Track scroll position for "scroll to bottom" button
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 300);
  }, []);

  // Infinite scroll up — load older messages
  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);

    const oldestMsg = messages[0];
    if (!oldestMsg) {
      setLoadingOlder(false);
      return;
    }

    try {
      const res = await apiFetch(
        `/api/conversations/${conversationId}/messages?limit=30&cursor=${encodeURIComponent(oldestMsg.createdAt)}`
      );
      if (!res.ok) return;
      const data = await res.json();

      if (data?.items?.length > 0) {
        const store = useChatStore.getState();
        const current = store.messagesByConversation[conversationId] ?? EMPTY_MESSAGES;
        // Prepend older messages, dedup by id
        const existingIds = new Set(current.map((m) => m.id));
        const newMsgs = data.items.filter(
          (m: Message) => !existingIds.has(m.id)
        );
        store.setMessages(conversationId, [...newMsgs, ...current]);
      }

      setHasMore(data.hasMore);
    } catch {
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, loadingOlder, hasMore, messages]);

  const handleScrollEvent = useCallback(() => {
    handleScroll();
    const el = scrollRef.current;
    if (el && el.scrollTop < 100 && hasMore) {
      loadOlder();
    }
  }, [handleScroll, hasMore, loadOlder]);

  function scrollToBottom() {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  // Reset hasMore when conversation changes
  useEffect(() => {
    setHasMore(true);
  }, [conversationId]);

  let lastDay = "";

  return (
    <div
      className="messages"
      ref={scrollRef}
      onScroll={handleScrollEvent}
    >
      {loadingOlder && (
        <div
          style={{
            textAlign: "center",
            padding: 12,
            color: "var(--ink-3)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
        >
          loading older messages…
        </div>
      )}

      {messages.length === 0 ? (
        <div className="empty-state">
          <div>
            <div className="empty-state-icon">💬</div>
            <h2>say something</h2>
            <p>send the first message to start the conversation</p>
          </div>
        </div>
      ) : (
        messages.map((message, index) => {
          const prev = messages[index - 1];
          const next = messages[index + 1];
          const isMe = message.senderId === currentUser?.id;
          const showAvatar = (!next || next.senderId !== message.senderId) && !isMe;

          const day = new Date(message.createdAt).toLocaleDateString();
          let showDay = false;
          if (day !== lastDay) {
            lastDay = day;
            showDay = true;
          }

          const samePrev = prev && prev.senderId === message.senderId && !showDay;
          const sameNext = next && next.senderId === message.senderId;
          let stackClass = "";
          if (samePrev && sameNext) stackClass = "stacked-mid";
          else if (samePrev) stackClass = "stacked-bot";
          else if (sameNext) stackClass = "stacked-top";

          return (
            <div key={message.id}>
              {showDay && (
                <div className="day-divider">
                  <span>{formatDay(message.createdAt)}</span>
                </div>
              )}
              <MessageBubble
                message={message}
                isOwn={isMe}
                showAvatar={showAvatar}
                stackClass={stackClass}
                onReply={onReply}
              />
            </div>
          );
        })
      )}

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          style={{
            position: "sticky",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--bg-elev)",
            border: "1px solid var(--line)",
            borderRadius: 999,
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--primary)",
            boxShadow: "var(--shadow-card)",
            cursor: "pointer",
            zIndex: 10,
            animation: "pop-in 0.2s ease",
          }}
        >
          ↓ new messages
        </button>
      )}
    </div>
  );
}

function formatDay(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
