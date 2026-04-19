"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useConversationStore } from "@/stores/conversation-store";
import { apiFetch } from "@/lib/api-client";
import { UserAvatar } from "./UserAvatar";
import { Icons } from "./Icons";
import type { Conversation } from "@chat-app/shared";

interface ConversationItemProps {
  conversation: Conversation;
}

type ManageAction = "mute" | "unmute" | "archive" | "unarchive" | "pin" | "unpin" | "delete";

export function ConversationItem({ conversation }: ConversationItemProps) {
  const router = useRouter();
  const activeConversationId = useConversationStore((s) => s.activeConversationId);
  const currentUser = useAuthStore((s) => s.currentUser);
  const updateConversation = useConversationStore((s) => s.updateConversation);
  const removeConversation = useConversationStore((s) => s.removeConversation);
  const isActive = activeConversationId === conversation.id;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const draft = useConversationStore((s) => s.drafts[conversation.id]);

  const otherParticipant =
    conversation.type === "DIRECT"
      ? conversation.participants.find((p) => p.userId !== currentUser?.id)
      : null;

  const displayName =
    conversation.type === "GROUP"
      ? conversation.name || "Group Chat"
      : otherParticipant?.user.nickname || "Unknown";

  const lastMessage = conversation.lastMessage;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  async function handleAction(action: ManageAction) {
    setMenuOpen(false);
    try {
      const res = await apiFetch(`/api/conversations/${conversation.id}/manage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        if (action === "delete") {
          removeConversation(conversation.id);
          if (isActive) router.push("/");
        } else {
          updateConversation(conversation.id, {
            isMuted: data.isMuted,
            isArchived: data.isArchived,
            isPinned: data.isPinned,
          });
        }
      }
    } catch (err) {
      console.error(`[ConversationItem] action ${action} failed:`, err);
    }
  }

  return (
    <div className="convo-item-wrap" style={{ position: "relative" }}>
      <Link
        href={`/c/${conversation.id}`}
        className={`convo ${isActive ? "active" : ""}`}
      >
        <UserAvatar name={displayName} isGroup={conversation.type === "GROUP"} />

        <div className="convo-body">
          <div className="convo-row">
            <span className="convo-name">
              {conversation.isPinned && (
                <span className="convo-pin-icon" title="Pinned">
                  <Icons.Pin />
                </span>
              )}
              {displayName}
            </span>
            {lastMessage && (
              <span className="convo-time">{formatTime(lastMessage.createdAt)}</span>
            )}
          </div>
          <div className="convo-last">
            {draft ? (
              <span style={{ color: "var(--pink)" }}>
                Draft: {draft.slice(0, 40)}
              </span>
            ) : lastMessage ? (
              lastMessage.deletedAt
                ? "message deleted"
                : lastMessage.text
            ) : (
              "start a conversation"
            )}
          </div>
        </div>

        {conversation.isMuted ? (
          <div className="convo-muted-icon" title="Muted">
            <Icons.BellOff />
          </div>
        ) : conversation.unreadCount > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div className="convo-badge">{conversation.unreadCount}</div>
          </div>
        ) : null}
      </Link>

      <button
        ref={btnRef}
        className="convo-menu-btn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
        title="More options"
      >
        <Icons.MoreVertical />
      </button>

      {menuOpen && (
        <div ref={menuRef} className="context-menu convo-context-menu">
          <button onClick={() => handleAction(conversation.isMuted ? "unmute" : "mute")}>
            {conversation.isMuted ? <Icons.Bell /> : <Icons.BellOff />}
            {conversation.isMuted ? "Unmute" : "Mute"}
          </button>
          <button onClick={() => handleAction(conversation.isPinned ? "unpin" : "pin")}>
            {conversation.isPinned ? <Icons.Unpin /> : <Icons.Pin />}
            {conversation.isPinned ? "Unpin" : "Pin"}
          </button>
          <button onClick={() => handleAction(conversation.isArchived ? "unarchive" : "archive")}>
            <Icons.Archive />
            {conversation.isArchived ? "Unarchive" : "Archive"}
          </button>
          <button className="danger" onClick={() => handleAction("delete")}>
            <Icons.Trash />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
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
