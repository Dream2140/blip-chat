"use client";

import Link from "next/link";
import { useChatStore } from "@/stores/chat-store";
import { UserAvatar } from "./UserAvatar";
import type { Conversation } from "@chat-app/shared";

interface ConversationItemProps {
  conversation: Conversation;
}

export function ConversationItem({ conversation }: ConversationItemProps) {
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const currentUser = useChatStore((s) => s.currentUser);
  const isActive = activeConversationId === conversation.id;

  const otherParticipant =
    conversation.type === "DIRECT"
      ? conversation.participants.find((p) => p.userId !== currentUser?.id)
      : null;

  const displayName =
    conversation.type === "GROUP"
      ? conversation.name || "Group Chat"
      : otherParticipant?.user.nickname || "Unknown";

  const lastMessage = conversation.lastMessage;

  return (
    <Link
      href={`/c/${conversation.id}`}
      className={`convo ${isActive ? "active" : ""}`}
    >
      <UserAvatar name={displayName} />

      <div className="convo-body">
        <div className="convo-row">
          <span className="convo-name">{displayName}</span>
          {lastMessage && (
            <span className="convo-time">{formatTime(lastMessage.createdAt)}</span>
          )}
        </div>
        <div className="convo-last">
          {lastMessage
            ? lastMessage.deletedAt
              ? "message deleted"
              : lastMessage.text
            : "start a conversation"}
        </div>
      </div>

      {conversation.unreadCount > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div className="convo-badge">{conversation.unreadCount}</div>
        </div>
      )}
    </Link>
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
