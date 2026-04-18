"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { apiFetch } from "@/lib/api-client";
import { ConversationItem } from "./ConversationItem";
import { UserAvatar } from "./UserAvatar";
import { NewGroupModal } from "./NewGroupModal";
import { Icons } from "./Icons";
import type { User } from "@chat-app/shared";

interface MessageSearchResult {
  id: string;
  text: string;
  conversationId: string;
  senderId: string;
  senderNickname: string;
  createdAt: string;
}

interface SearchResults {
  users: User[];
  messages: MessageSearchResult[];
}

type Tab = "chats" | "people";

export function Sidebar() {
  const router = useRouter();
  const conversations = useChatStore((s) => s.conversations);
  const currentUser = useChatStore((s) => s.currentUser);
  const addConversation = useChatStore((s) => s.addConversation);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [tab, setTab] = useState<Tab>("chats");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global search with debounce
  const performSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    performSearch(value);
  }

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  // Fetch all users when People tab is activated
  useEffect(() => {
    if (tab !== "people") return;
    setLoadingUsers(true);
    apiFetch("/api/users/all")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.users) setAllUsers(data.users);
      })
      .finally(() => setLoadingUsers(false));
  }, [tab]);

  async function startDirectChat(userId: string) {
    const res = await apiFetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "DIRECT", participantIds: [userId] }),
    });

    if (res.ok) {
      const data = await res.json();
      // Add to store if not already there
      const exists = conversations.find((c) => c.id === data.conversation.id);
      if (!exists) {
        addConversation(data.conversation);
      }
      setTab("chats");
      router.push(`/c/${data.conversation.id}`);
    }
  }

  const filteredConversations = conversations.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.participants.some((p) => p.user.nickname.toLowerCase().includes(q))
    );
  });

  const filteredUsers = allUsers.filter((u) => {
    if (!query) return true;
    return u.nickname.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-mark">
            <div className="logo-blob" />
            <span>blip</span>
          </div>
          <div className="header-actions">
            <button
              className="icon-btn"
              title="New group"
              onClick={() => setShowNewGroup(true)}
            >
              <Icons.Plus />
            </button>
            <button
              className="icon-btn"
              title="Settings"
              onClick={() => router.push("/settings")}
            >
              <Icons.Settings />
            </button>
          </div>
        </div>

        {currentUser && (
          <div className="me-chip">
            <div
              className="avatar"
              style={{
                width: 36,
                height: 36,
                fontSize: 16,
                background: stringToColor(currentUser.nickname),
              }}
            >
              {currentUser.nickname[0]?.toUpperCase()}
              <span className="presence-dot online" />
            </div>
            <div className="me-text">
              <span className="me-name">{currentUser.nickname}</span>
              <span className="me-handle">
                @{currentUser.nickname} · online
              </span>
            </div>
            <button
              className="icon-btn"
              title="Logout"
              onClick={handleLogout}
              style={{ width: 28, height: 28 }}
            >
              <Icons.X />
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "0 16px",
          marginBottom: 8,
          background: "var(--bg-sunk)",
        }}
      >
        <button
          onClick={() => setTab("chats")}
          style={{
            flex: 1,
            padding: "8px 0",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 10,
            background: tab === "chats" ? "var(--bg-elev)" : "transparent",
            color: tab === "chats" ? "var(--ink)" : "var(--ink-3)",
            boxShadow: tab === "chats" ? "var(--shadow-card)" : "none",
            transition: "all 0.15s",
          }}
        >
          chats
        </button>
        <button
          onClick={() => setTab("people")}
          style={{
            flex: 1,
            padding: "8px 0",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 10,
            background: tab === "people" ? "var(--bg-elev)" : "transparent",
            color: tab === "people" ? "var(--ink)" : "var(--ink-3)",
            boxShadow: tab === "people" ? "var(--shadow-card)" : "none",
            transition: "all 0.15s",
          }}
        >
          people
        </button>
      </div>

      <div className="search-wrap">
        <Icons.Search />
        <input
          className="search-input"
          placeholder="search messages, people…"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
      </div>

      {searchResults !== null ? (
        /* Global search results */
        <div className="convo-list">
          {searchLoading ? (
            <div
              style={{
                textAlign: "center",
                padding: 24,
                color: "var(--ink-3)",
                fontSize: 13,
              }}
            >
              searching…
            </div>
          ) : searchResults.messages.length === 0 &&
            searchResults.users.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 24,
                color: "var(--ink-3)",
                fontSize: 13,
              }}
            >
              no results
            </div>
          ) : (
            <>
              {searchResults.messages.length > 0 && (
                <>
                  <div className="convo-section-label">
                    in messages &middot; {searchResults.messages.length}
                  </div>
                  {searchResults.messages.map((msg) => (
                    <button
                      key={msg.id}
                      className="convo"
                      onClick={() => {
                        setQuery("");
                        setSearchResults(null);
                        router.push(`/c/${msg.conversationId}`);
                      }}
                      style={{ width: "100%", textAlign: "left" }}
                    >
                      <UserAvatar name={msg.senderNickname} />
                      <div className="convo-body">
                        <div className="convo-row">
                          <span className="convo-name">
                            {msg.senderNickname}
                          </span>
                          <span className="convo-time">
                            {formatSearchTime(msg.createdAt)}
                          </span>
                        </div>
                        <div
                          className="convo-last"
                          dangerouslySetInnerHTML={{
                            __html: highlightMatch(
                              truncateText(msg.text, 60),
                              query
                            ),
                          }}
                        />
                      </div>
                    </button>
                  ))}
                </>
              )}

              {searchResults.users.length > 0 && (
                <>
                  <div className="convo-section-label">
                    people &middot; {searchResults.users.length}
                  </div>
                  {searchResults.users.map((user) => (
                    <button
                      key={user.id}
                      className="convo"
                      onClick={() => {
                        setQuery("");
                        setSearchResults(null);
                        startDirectChat(user.id);
                      }}
                      style={{ width: "100%", textAlign: "left" }}
                    >
                      <UserAvatar name={user.nickname} />
                      <div className="convo-body">
                        <div className="convo-name">{user.nickname}</div>
                        <div className="convo-last">
                          @{user.nickname}
                          {user.bio ? ` · ${user.bio}` : ""}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      ) : tab === "chats" ? (
        <>
          <div className="convo-section-label">direct messages</div>
          <div className="convo-list">
            {filteredConversations.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 24,
                  color: "var(--ink-3)",
                  fontSize: 13,
                }}
              >
                {conversations.length === 0 ? (
                  <>
                    no chats yet
                    <br />
                    <button
                      onClick={() => setTab("people")}
                      style={{
                        color: "var(--primary)",
                        fontWeight: 600,
                        marginTop: 8,
                        fontSize: 13,
                      }}
                    >
                      find someone to chat with →
                    </button>
                  </>
                ) : (
                  "no results"
                )}
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                />
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div className="convo-section-label">
            all users · {filteredUsers.length}
          </div>
          <div className="convo-list">
            {loadingUsers ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 24,
                  color: "var(--ink-3)",
                  fontSize: 13,
                }}
              >
                loading…
              </div>
            ) : filteredUsers.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 24,
                  color: "var(--ink-3)",
                  fontSize: 13,
                }}
              >
                {allUsers.length === 0
                  ? "no other users yet — invite someone!"
                  : "no results"}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  className="convo"
                  onClick={() => startDirectChat(user.id)}
                  style={{ width: "100%", textAlign: "left" }}
                >
                  <UserAvatar name={user.nickname} />
                  <div className="convo-body">
                    <div className="convo-name">{user.nickname}</div>
                    <div className="convo-last">
                      @{user.nickname}
                      {user.bio ? ` · ${user.bio}` : ""}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} />}
    </aside>
  );
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "…";
}

function highlightMatch(text: string, query: string): string {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const escapedQuery = escapeHtml(query).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  return escaped.replace(regex, "<mark>$1</mark>");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatSearchTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function stringToColor(str: string): string {
  const colors = [
    "#FF6B9D",
    "#FFD93D",
    "#6BCB77",
    "#8B5CF6",
    "#FF8C42",
    "#4ECDC4",
    "#A78BFA",
    "#F472B6",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
