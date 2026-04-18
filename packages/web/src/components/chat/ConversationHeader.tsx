"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useChatStore } from "@/stores/chat-store";
import { apiFetch } from "@/lib/api-client";
import { UserAvatar } from "./UserAvatar";
import { Icons } from "./Icons";

// Cache pinned counts per conversation to avoid re-fetching
const pinnedCache = new Map<string, { count: number; ts: number }>();
const CACHE_TTL = 60000; // 1 minute

interface ConversationHeaderProps {
  conversationId: string;
}

export function ConversationHeader({ conversationId }: ConversationHeaderProps) {
  const conversation = useChatStore((s) =>
    s.conversations.find((c) => c.id === conversationId)
  );
  const currentUser = useChatStore((s) => s.currentUser);
  const [pinnedCount, setPinnedCount] = useState(0);
  const fetched = useRef(false);

  useEffect(() => {
    fetched.current = false;
  }, [conversationId]);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    // Check cache first
    const cached = pinnedCache.get(conversationId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setPinnedCount(cached.count);
      return;
    }

    apiFetch(`/api/conversations/${conversationId}/pinned`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const count = data?.items?.length || 0;
        setPinnedCount(count);
        pinnedCache.set(conversationId, { count, ts: Date.now() });
      })
      .catch(() => {});
  }, [conversationId]);

  if (!conversation) return null;

  const otherParticipant =
    conversation.type === "DIRECT"
      ? conversation.participants.find((p) => p.userId !== currentUser?.id)
      : null;

  const displayName =
    conversation.type === "GROUP"
      ? conversation.name || "Group Chat"
      : otherParticipant?.user.nickname || "Unknown";

  return (
    <>
      <header className="chat-header">
        <Link href="/" className="icon-btn mobile-back" style={{ textDecoration: "none" }}>
          ←
        </Link>
        <UserAvatar name={displayName} />
        <div>
          <div className="chat-title">{displayName}</div>
          <div className="chat-sub">
            {conversation.type === "GROUP"
              ? `${conversation.participants.length} members`
              : "tap for info"}
          </div>
        </div>
        <div className="header-spacer" />
        <button className="icon-btn"><Icons.Phone /></button>
        <button className="icon-btn"><Icons.Video /></button>
        <button className="icon-btn"><Icons.More /></button>
      </header>
      {pinnedCount > 0 && (
        <div className="pinned-banner" style={{ cursor: "pointer" }}>
          <span>📌 {pinnedCount} pinned message{pinnedCount !== 1 ? "s" : ""}</span>
        </div>
      )}
    </>
  );
}
