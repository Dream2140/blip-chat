"use client";

import { UserAvatar } from "./UserAvatar";
import type { Message } from "@chat-app/shared";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  stackClass: string;
}

export function MessageBubble({ message, isOwn, showAvatar, stackClass }: MessageBubbleProps) {
  if (message.deletedAt) {
    return (
      <div className={`msg-row ${isOwn ? "me" : ""}`}>
        <div className="msg-group">
          <div
            className="bubble"
            style={{ fontStyle: "italic", opacity: 0.5 }}
          >
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

  return (
    <div className={`msg-row ${isOwn ? "me" : ""} ${showAvatar ? "show-avatar" : ""}`}>
      {!isOwn && (
        <UserAvatar
          name={message.sender?.nickname || "?"}
          size="sm"
        />
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
              <button title="heart">❤️</button>
              <button title="laugh">😂</button>
              <button title="fire">🔥</button>
              <button title="reply">↩</button>
            </div>
          </div>
        </div>

        <div className="meta">
          <span>{time}</span>
          {isOwn && <span className="read-ticks">{readText}</span>}
        </div>
      </div>
    </div>
  );
}
