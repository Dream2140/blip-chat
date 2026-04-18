"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { ConversationItem } from "./ConversationItem";
import { SearchUsers } from "./SearchUsers";
import { NewGroupModal } from "./NewGroupModal";
import { Icons } from "./Icons";

export function Sidebar() {
  const router = useRouter();
  const conversations = useChatStore((s) => s.conversations);
  const currentUser = useChatStore((s) => s.currentUser);
  const [showSearch, setShowSearch] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  const [query, setQuery] = useState("");

  const filtered = conversations.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.participants.some((p) => p.user.nickname.toLowerCase().includes(q))
    );
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
              title="New chat"
              onClick={() => setShowSearch(true)}
            >
              <Icons.Plus />
            </button>
            <button
              className="icon-btn"
              title="New group"
              onClick={() => setShowNewGroup(true)}
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

      <div className="search-wrap">
        <Icons.Search />
        <input
          className="search-input"
          placeholder="search friends, messages…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="convo-section-label">direct messages</div>
      <div className="convo-list">
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 24,
              color: "var(--ink-3)",
              fontSize: 13,
            }}
          >
            {conversations.length === 0
              ? "no chats yet — start one!"
              : "no results"}
          </div>
        ) : (
          filtered.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
            />
          ))
        )}
      </div>

      {showSearch && <SearchUsers onClose={() => setShowSearch(false)} />}
      {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} />}
    </aside>
  );
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
