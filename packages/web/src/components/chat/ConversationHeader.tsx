"use client";

import Link from "next/link";
import { useChatStore } from "@/stores/chat-store";
import { UserAvatar } from "./UserAvatar";
import { ThemeToggle } from "./ThemeToggle";
import { Icons } from "./Icons";

interface ConversationHeaderProps {
  conversationId: string;
}

export function ConversationHeader({ conversationId }: ConversationHeaderProps) {
  const conversation = useChatStore((s) =>
    s.conversations.find((c) => c.id === conversationId)
  );
  const currentUser = useChatStore((s) => s.currentUser);
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);
  const typingUsers = useChatStore((s) => s.typingUsers[conversationId] || []);

  if (!conversation) return null;

  const otherParticipant =
    conversation.type === "DIRECT"
      ? conversation.participants.find((p) => p.userId !== currentUser?.id)
      : null;

  const displayName =
    conversation.type === "GROUP"
      ? conversation.name || "Group Chat"
      : otherParticipant?.user.nickname || "Unknown";

  const isOnline = otherParticipant
    ? onlineUserIds.has(otherParticipant.userId)
    : false;

  const isTyping = typingUsers.length > 0;

  return (
    <header className="chat-header">
      <Link href="/" className="icon-btn mobile-back" style={{ textDecoration: "none" }}>
        ←
      </Link>
      <UserAvatar
        name={displayName}
        isOnline={conversation.type === "DIRECT" ? isOnline : undefined}
      />
      <div>
        <div className="chat-title">{displayName}</div>
        <div className="chat-sub">
          {isTyping ? (
            <>typing…</>
          ) : conversation.type === "DIRECT" ? (
            isOnline ? (
              <>
                <span className="dot" /> active now
              </>
            ) : (
              <>offline</>
            )
          ) : (
            <>{conversation.participants.length} members</>
          )}
        </div>
      </div>
      <div className="header-spacer" />
      <ThemeToggle />
      <button className="icon-btn">
        <Icons.Phone />
      </button>
      <button className="icon-btn">
        <Icons.Video />
      </button>
      <button className="icon-btn">
        <Icons.More />
      </button>
    </header>
  );
}
