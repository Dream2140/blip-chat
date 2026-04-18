"use client";

import Link from "next/link";
import { useChatStore } from "@/stores/chat-store";
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
  );
}
