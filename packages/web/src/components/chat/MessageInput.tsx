"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useConversationStore } from "@/stores/conversation-store";
import { useSocket } from "@/hooks/useSocket";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "./Toast";
import { Icons } from "./Icons";
import { EmojiPicker } from "./EmojiPicker";
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
  const draft = useConversationStore((s) => s.drafts[conversationId] || "");
  const [text, setText] = useState(draft);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const showToast = useToast((s) => s.show);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Typing indicator
  const { emitTypingStart, emitTypingStop } = useSocket();
  const typingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleTyping() {
    if (!typingRef.current) {
      typingRef.current = true;
      emitTypingStart(conversationId);
    }

    // Reset auto-stop timer — stop after 5s of no typing
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingRef.current = false;
      emitTypingStop(conversationId);
    }, 5000);
  }

  function stopTyping() {
    if (typingRef.current) {
      typingRef.current = false;
      clearTimeout(typingTimeoutRef.current);
      emitTypingStop(conversationId);
    }
  }

  // Cleanup on unmount: clear timeout and send stop if typing
  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      if (typingRef.current) {
        emitTypingStop(conversationId);
        typingRef.current = false;
      }
    };
  }, [conversationId, emitTypingStop]);

  // Restore draft on conversation change
  useEffect(() => {
    const d = useConversationStore.getState().drafts[conversationId] || "";
    setText(d);
  }, [conversationId]);

  // Save draft on text change (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (text.trim()) {
        useConversationStore.getState().setDraft(conversationId, text);
      } else {
        useConversationStore.getState().clearDraft(conversationId);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [text, conversationId]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [text, autoResize]);

  function handleEmojiSelect(emoji: string) {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);

    const currentUser = useAuthStore.getState().currentUser;
    const tempId = `temp-${Date.now()}`;

    if (currentUser) {
      useConversationStore.getState().addMessage(conversationId, {
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

    stopTyping();
    setText("");
    useConversationStore.getState().clearDraft(conversationId);
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
          useConversationStore.getState().messagesByConversation[conversationId] || [];
        useConversationStore
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
        useConversationStore.getState().messagesByConversation[conversationId] || [];
      useConversationStore
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
    if (e.key === "Escape") {
      setShowEmoji(false);
      onClearReply?.();
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
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            const val = e.target.value;
            setText(val);
            if (val.trim()) {
              handleTyping();
            } else {
              stopTyping();
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="message…"
          rows={1}
        />
        <div className="composer-actions">
          <button
            className="icon-btn"
            title="Emoji"
            onClick={() => setShowEmoji((v) => !v)}
          >
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
      {showEmoji && <EmojiPicker onSelect={handleEmojiSelect} />}
    </div>
  );
}
