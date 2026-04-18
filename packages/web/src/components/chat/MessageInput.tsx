"use client";

import { useState, useRef, useCallback } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useChatStore } from "@/stores/chat-store";
import { Icons } from "./Icons";

interface MessageInputProps {
  conversationId: string;
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { emitTypingStart, emitTypingStop } = useSocket();
  const addMessage = useChatStore((s) => s.addMessage);
  const currentUser = useChatStore((s) => s.currentUser);

  const conversation = useChatStore((s) =>
    s.conversations.find((c) => c.id === conversationId)
  );
  const otherParticipant = conversation?.participants.find(
    (p) => p.userId !== currentUser?.id
  );
  const placeholderName = otherParticipant?.user.nickname || "someone";

  const handleTyping = useCallback(() => {
    emitTypingStart(conversationId);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      emitTypingStop(conversationId);
    }, 2000);
  }, [conversationId, emitTypingStart, emitTypingStop]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    emitTypingStop(conversationId);

    const tempId = `temp-${Date.now()}`;
    if (currentUser) {
      addMessage(conversationId, {
        id: tempId,
        conversationId,
        senderId: currentUser.id,
        sender: currentUser,
        text: trimmed,
        replyToId: null,
        replyTo: null,
        editedAt: null,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        status: "sent",
      });
    }

    setText("");

    try {
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder={`message ${placeholderName}…`}
          rows={1}
        />
        <div className="composer-actions">
          <button className="icon-btn" title="Attach">
            <Icons.Paperclip />
          </button>
          <button className="icon-btn" title="Emoji">
            <Icons.Smile />
          </button>
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            title="Send"
          >
            <Icons.Send />
          </button>
        </div>
      </div>
    </div>
  );
}
