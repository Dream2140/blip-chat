"use client";

import { useState } from "react";
import { useChatStore } from "@/stores/chat-store";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "./Toast";
import { Icons } from "./Icons";

interface MessageInputProps {
  conversationId: string;
}

export function MessageInput({ conversationId }: MessageInputProps) {
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

    // Optimistic: add temp message
    if (currentUser) {
      store.addMessage(conversationId, {
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
      const res = await apiFetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!res.ok) {
        // Remove temp message on failure
        const msgs = useChatStore.getState().messagesByConversation[conversationId] || [];
        useChatStore.getState().setMessages(
          conversationId,
          msgs.filter((m) => m.id !== tempId)
        );
        showToast("Failed to send message");
        return;
      }

      const data = await res.json();

      // Replace temp message with real one (dedup)
      const currentMsgs = useChatStore.getState().messagesByConversation[conversationId] || [];
      useChatStore.getState().setMessages(
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
