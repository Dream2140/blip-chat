"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { useConversationStore } from "@/stores/conversation-store";
import { useLiveStore } from "@/stores/live-store";
import { apiFetch } from "@/lib/api-client";
import { useSocket } from "@/hooks/useSocket";
import { UserAvatar } from "./UserAvatar";
import { Icons } from "./Icons";
import type { Message } from "@chat-app/shared";

const pinnedCache = new Map<string, { count: number; ts: number }>();
const CACHE_TTL = 60000;

function formatLastSeen(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

interface ConversationHeaderProps {
  conversationId: string;
}

export function ConversationHeader({ conversationId }: ConversationHeaderProps) {
  const conversation = useConversationStore((s) =>
    s.conversations.find((c) => c.id === conversationId)
  );
  const currentUser = useAuthStore((s) => s.currentUser);
  const [pinnedCount, setPinnedCount] = useState(0);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [showPinned, setShowPinned] = useState(false);
  const fetched = useRef(false);

  // In-conversation search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; text: string; createdAt: string }>>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    const res = await apiFetch(
      `/api/conversations/${conversationId}/messages?search=${encodeURIComponent(q)}&limit=50`
    );
    if (res.ok) {
      const data = await res.json();
      setSearchResults(data.items.map((m: any) => ({ id: m.id, text: m.text, createdAt: m.createdAt })));
      setSearchIndex(0);
    }
  }, [conversationId]);

  const debouncedSearch = useMemo(() => {
    return (q: string) => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => doSearch(q), 300);
    };
  }, [doSearch]);

  const navigateResult = useCallback((dir: number) => {
    if (searchResults.length === 0) return;
    const newIndex = (searchIndex + dir + searchResults.length) % searchResults.length;
    setSearchIndex(newIndex);
    const msgEl = document.getElementById(`msg-${searchResults[newIndex].id}`);
    if (msgEl) {
      msgEl.scrollIntoView({ behavior: "smooth", block: "center" });
      msgEl.classList.add("highlight-msg");
      setTimeout(() => msgEl.classList.remove("highlight-msg"), 2000);
    }
  }, [searchResults, searchIndex]);

  useEffect(() => {
    fetched.current = false;
    setShowPinned(false);
  }, [conversationId]);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const cached = pinnedCache.get(conversationId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setPinnedCount(cached.count);
      return;
    }

    apiFetch(`/api/conversations/${conversationId}/pinned`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const items = data?.items || [];
        setPinnedCount(items.length);
        setPinnedMessages(items);
        pinnedCache.set(conversationId, { count: items.length, ts: Date.now() });
      })
      .catch((err) => console.error("[ConversationHeader] fetch pinned failed:", err));
  }, [conversationId]);

  const handlePinnedClick = useCallback(async () => {
    if (showPinned) {
      setShowPinned(false);
      return;
    }

    // Use cache if fresh enough
    const cached = pinnedCache.get(conversationId);
    if (cached && Date.now() - cached.ts < CACHE_TTL && pinnedMessages.length > 0) {
      setShowPinned(true);
      return;
    }

    // Fetch fresh
    try {
      const res = await apiFetch(`/api/conversations/${conversationId}/pinned`);
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        setPinnedMessages(items);
        setPinnedCount(items.length);
        pinnedCache.set(conversationId, { count: items.length, ts: Date.now() });
      }
    } catch (err) {
      console.error("[ConversationHeader] refresh pinned failed:", err);
    }
    setShowPinned(true);
  }, [conversationId, showPinned, pinnedMessages.length]);

  const { getSocket } = useSocket();

  const handleStartCall = useCallback(() => {
    if (!conversation || conversation.type !== "DIRECT") return;
    const other = conversation.participants.find((p) => p.userId !== currentUser?.id);
    if (!other) return;
    const targetUserId = other.userId;
    const targetNickname = other.user.nickname || "Unknown";

    useLiveStore.getState().startCall(targetUserId, targetNickname);

    const socket = getSocket();
    if (socket) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (socket as any).emit("call:initiate", {
        targetUserId,
        callerNickname: currentUser?.nickname || "Unknown",
      });
    }
  }, [conversation, currentUser, getSocket]);

  if (!conversation) return null;

  const otherParticipant =
    conversation.type === "DIRECT"
      ? conversation.participants.find((p) => p.userId !== currentUser?.id)
      : null;

  const otherUserId = otherParticipant?.userId;
  const isOnline = useLiveStore((s) => otherUserId ? s.onlineUserIds[otherUserId] : false);

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
        <UserAvatar name={displayName} isGroup={conversation.type === "GROUP"} />
        <div>
          <div className="chat-title">{displayName}</div>
          <div className="chat-sub">
            {conversation.type === "GROUP"
              ? `${conversation.participants.length} members`
              : isOnline
                ? <><span className="dot" style={{ background: "var(--mint)" }} /> online</>
                : otherParticipant?.user.lastSeenAt
                  ? `last seen ${formatLastSeen(otherParticipant.user.lastSeenAt)}`
                  : "tap for info"}
          </div>
        </div>
        <div className="header-spacer" />
        <button className="icon-btn" onClick={() => { setShowSearch((v) => !v); if (showSearch) { setSearchQuery(""); setSearchResults([]); } }}>
          <Icons.Search />
        </button>
        <button className="icon-btn" onClick={handleStartCall}><Icons.Phone /></button>
        <button className="icon-btn"><Icons.Video /></button>
        <button className="icon-btn"><Icons.More /></button>
      </header>
      {showSearch && (
        <div className="conv-search-bar">
          <input
            autoFocus
            placeholder="search in conversation..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              debouncedSearch(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }
              if (e.key === "Enter") navigateResult(1);
            }}
          />
          {searchResults.length > 0 && (
            <span className="conv-search-count">
              {searchIndex + 1}/{searchResults.length}
            </span>
          )}
          <button onClick={() => navigateResult(-1)} disabled={searchResults.length === 0}>&#9650;</button>
          <button onClick={() => navigateResult(1)} disabled={searchResults.length === 0}>&#9660;</button>
          <button onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }}>
            <Icons.X />
          </button>
        </div>
      )}
      {pinnedCount > 0 && (
        <div
          className="pinned-banner"
          onClick={handlePinnedClick}
          style={{ cursor: "pointer" }}
        >
          <span>📌 {pinnedCount} pinned message{pinnedCount !== 1 ? "s" : ""}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.7 }}>
            {showPinned ? "▲ hide" : "▼ show"}
          </span>
        </div>
      )}
      {showPinned && pinnedMessages.length > 0 && (
        <div
          style={{
            maxHeight: 200,
            overflowY: "auto",
            margin: "0 24px 8px",
            background: "var(--bg-elev)",
            borderRadius: 14,
            boxShadow: "var(--shadow-card)",
            padding: 8,
          }}
        >
          {pinnedMessages.map((msg) => (
            <div
              key={msg.id}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                fontSize: 13,
                lineHeight: 1.5,
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 11, color: "var(--primary)", marginBottom: 2 }}>
                {msg.sender?.nickname || "Unknown"}
              </div>
              <div>{msg.text}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>
                pinned {msg.pinnedAt ? new Date(msg.pinnedAt).toLocaleDateString() : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
