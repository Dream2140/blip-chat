"use client";

import { useConversationStore } from "@/stores/conversation-store";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "./Toast";
import { UserAvatar } from "./UserAvatar";
import type { Message, MessageReaction } from "@chat-app/shared";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  stackClass: string;
  onReply?: (message: Message) => void;
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  stackClass,
  onReply,
}: MessageBubbleProps) {
  if (message.deletedAt) {
    return (
      <div className={`msg-row ${isOwn ? "me" : ""}`}>
        <div className="msg-group">
          <div className="bubble" style={{ fontStyle: "italic", opacity: 0.5 }}>
            message deleted
          </div>
        </div>
      </div>
    );
  }

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const readText =
    message.status === "read"
      ? "✓✓ read"
      : message.status === "delivered"
        ? "✓✓"
        : "✓ sent";

  const toast = useToast();

  async function togglePin() {
    const res = await apiFetch(`/api/messages/${message.id}/pin`, {
      method: "POST",
    });

    if (res.ok) {
      const data = await res.json();
      useConversationStore.getState().updateMessage(
        message.conversationId,
        message.id,
        { pinnedAt: data.pinnedAt }
      );
      toast.show(
        data.pinnedAt ? "Message pinned" : "Message unpinned",
        "success"
      );
    }
  }

  async function toggleReaction(emoji: string) {
    const res = await apiFetch(`/api/messages/${message.id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });

    if (res.ok) {
      const data = await res.json();
      // Update message reactions in store
      useConversationStore.getState().updateMessage(
        message.conversationId,
        message.id,
        { reactions: data.reactions }
      );
    }
  }

  const reactions = message.reactions || [];

  return (
    <div
      className={`msg-row ${isOwn ? "me" : ""} ${showAvatar ? "show-avatar" : ""}`}
    >
      {!isOwn && (
        <UserAvatar name={message.sender?.nickname || "?"} size="sm" />
      )}
      <div className="msg-group">
        <div className="bubble-wrap">
          {message.replyTo && (
            <div className="reply-quote">
              <div className="rq-name">
                ↪ {message.replyTo.sender?.nickname || "you"}
              </div>
              <div>
                {message.replyTo.text?.slice(0, 60)}
                {(message.replyTo.text?.length || 0) > 60 ? "…" : ""}
              </div>
            </div>
          )}
          <div className={`bubble ${stackClass}`}>
            {message.text}
            <div className="hover-actions">
              <button onClick={() => toggleReaction("❤️")} title="heart">
                ❤️
              </button>
              <button onClick={() => toggleReaction("😂")} title="laugh">
                😂
              </button>
              <button onClick={() => toggleReaction("🔥")} title="fire">
                🔥
              </button>
              <button onClick={togglePin} title="pin">
                {"\uD83D\uDCCC"}
              </button>
              {onReply && (
                <button onClick={() => onReply(message)} title="reply">
                  ↩
                </button>
              )}
            </div>
          </div>
        </div>

        {reactions.length > 0 && (
          <div className="reactions">
            {reactions.map((r: MessageReaction) => (
              <button
                key={r.emoji}
                className={`reaction-chip ${r.byMe ? "by-me" : ""}`}
                onClick={() => toggleReaction(r.emoji)}
              >
                <span>{r.emoji}</span>
                {r.count > 1 && <span className="count">{r.count}</span>}
              </button>
            ))}
          </div>
        )}

        <div className="meta">
          <span>{time}</span>
          {isOwn && <span className="read-ticks">{readText}</span>}
        </div>
      </div>
    </div>
  );
}
