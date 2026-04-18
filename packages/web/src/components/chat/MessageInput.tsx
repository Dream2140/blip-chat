"use client";

import { useState } from "react";
import { useChatStore } from "@/stores/chat-store";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "./Toast";
import { Icons } from "./Icons";
import type { Message } from "@chat-app/shared";

interface MessageInputProps {
  conversationId: string;
  replyTo?: Message | null;
  onClearReply?: () => void;
}

export function MessageInput({
  conversationId,
  replyTo,
  onClearReply,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const showToast = useToast((s) => s.show);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);

    const store = useChatStore.getState();
    const currentUser = store.currentUser;
    const tempId = `temp-${Date.now()}`;

    if (currentUser) {
      store.addMessage(conversationId, {
        id: tempId,
        conversationId,
        senderId: currentUser.id,
        sender: currentUser,
        text: trimmed,
        replyToId: replyTo?.id || null,
        replyTo: replyTo || null,
        editedAt: null,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        status: "sent",
        reactions: [],
      });
    }

    setText("");
    onClearReply?.();

    try {
      const res = await apiFetch(
        `/api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: trimmed,
            replyToId: replyTo?.id,
          }),
        }
      );

      if (!res.ok) {
        const msgs =
          useChatStore.getState().messagesByConversation[conversationId] || [];
        useChatStore
          .getState()
          .setMessages(
            conversationId,
            msgs.filter((m) => m.id !== tempId)
          );
        showToast("Failed to send message");
        return;
      }

      const data = await res.json();
      const currentMsgs =
        useChatStore.getState().messagesByConversation[conversationId] || [];
      useChatStore
        .getState()
        .setMessages(
          conversationId,
          currentMsgs.map((m) => (m.id === tempId ? data.message : m))
        );
    } catch {
      showToast("Network error — message not sent");
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
      {replyTo && (
        <div className="reply-preview">
          <div>
            <span className="rp-label">
              replying to {replyTo.sender?.nickname || "..."}
            </span>
            <span className="rp-text">
              {replyTo.text.slice(0, 60)}
              {replyTo.text.length > 60 ? "…" : ""}
            </span>
          </div>
          <button
            className="icon-btn"
            onClick={onClearReply}
            style={{ width: 24, height: 24 }}
          >
            <Icons.X />
          </button>
        </div>
      )}
      <div className="composer">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="message…"
          rows={1}
        />
        <div className="composer-actions">
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
