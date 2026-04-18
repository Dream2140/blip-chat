"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chat-store";
import { MessageBubble } from "./MessageBubble";
import { UserAvatar } from "./UserAvatar";
import type { Message } from "@chat-app/shared";

interface MessageListProps {
  conversationId: string;
  messages: Message[];
}

export function MessageList({ conversationId, messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentUser = useChatStore((s) => s.currentUser);
  const typingUsers = useChatStore((s) => s.typingUsers[conversationId] || []);
  const conversation = useChatStore((s) =>
    s.conversations.find((c) => c.id === conversationId)
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typingUsers.length]);

  // Group messages by day
  let lastDay = "";

  return (
    <div className="messages">
      {messages.length === 0 ? (
        <div className="empty-state">
          <div>
            <div className="empty-state-icon">💬</div>
            <h2>say something</h2>
            <p>send the first message to start the conversation</p>
          </div>
        </div>
      ) : (
        messages.map((message, index) => {
          const prev = messages[index - 1];
          const next = messages[index + 1];
          const isMe = message.senderId === currentUser?.id;
          const showAvatar = !next || next.senderId !== message.senderId;

          // Day divider
          const day = new Date(message.createdAt).toLocaleDateString();
          let showDay = false;
          if (day !== lastDay) {
            lastDay = day;
            showDay = true;
          }

          // Stack class for grouped bubbles
          const samePrev = prev && prev.senderId === message.senderId && !showDay;
          const sameNext = next && next.senderId === message.senderId;
          let stackClass = "";
          if (samePrev && sameNext) stackClass = "stacked-mid";
          else if (samePrev) stackClass = "stacked-bot";
          else if (sameNext) stackClass = "stacked-top";

          return (
            <div key={message.id}>
              {showDay && (
                <div className="day-divider">
                  <span>{formatDay(message.createdAt)}</span>
                </div>
              )}
              <MessageBubble
                message={message}
                isOwn={isMe}
                showAvatar={showAvatar && !isMe}
                stackClass={stackClass}
              />
            </div>
          );
        })
      )}

      {typingUsers.length > 0 && (
        <div className="typing-row">
          {conversation?.participants
            .filter((p) => typingUsers.includes(p.userId))
            .map((p) => (
              <UserAvatar
                key={p.userId}
                name={p.user.nickname}
                size="sm"
              />
            ))}
          <div className="typing-bubble">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function formatDay(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "yesterday";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
