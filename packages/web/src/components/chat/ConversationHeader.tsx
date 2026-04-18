"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useChatStore } from "@/stores/chat-store";
import { apiFetch } from "@/lib/api-client";
import { UserAvatar } from "./UserAvatar";
import { Icons } from "./Icons";

interface ConversationHeaderProps {
  conversationId: string;
}

export function ConversationHeader({ conversationId }: ConversationHeaderProps) {
  const conversation = useChatStore((s) =>
    s.conversations.find((c) => c.id === conversationId)
  );
  const currentUser = useChatStore((s) => s.currentUser);
  const [pinnedCount, setPinnedCount] = useState(0);

  const fetchPinnedCount = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/conversations/${conversationId}/pinned`);
      if (res.ok) {
        const data = await res.json();
        setPinnedCount(data.items?.length || 0);
      }
    } catch {
      // ignore fetch errors
    }
  }, [conversationId]);

  useEffect(() => {
    fetchPinnedCount();
  }, [fetchPinnedCount]);

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
          <span>{"\uD83D\uDCCC"} {pinnedCount} pinned message{pinnedCount !== 1 ? "s" : ""}</span>
        </div>
      )}
    </>
  );
}
