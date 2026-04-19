"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConversationStore } from "@/stores/conversation-store";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "./Toast";
import { UserAvatar } from "./UserAvatar";
import type { Message } from "@chat-app/shared";

interface ForwardModalProps {
  message: Message;
  onClose: () => void;
}

export function ForwardModal({ message, onClose }: ForwardModalProps) {
  const [sending, setSending] = useState(false);
  const conversations = useConversationStore((s) => s.conversations);
  const currentUser = useAuthStore((s) => s.currentUser);
  const toast = useToast();
  const router = useRouter();

  const senderNickname = message.sender?.nickname || "Unknown";
  const previewText = `\u21AA Forwarded from ${senderNickname}:\n${message.text}`;

  async function forwardTo(conversationId: string) {
    setSending(true);
    try {
      const res = await apiFetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: previewText }),
      });

      if (res.ok) {
        const data = await res.json();
        useConversationStore.getState().addMessage(conversationId, data.message);
        toast.show("Message forwarded", "success");
        onClose();
        router.push(`/c/${conversationId}`);
      } else {
        const err = await res.json().catch(() => null);
        toast.show(err?.error || "Failed to forward message", "error");
      }
    } catch {
      toast.show("Network error — forward failed", "error");
    } finally {
      setSending(false);
    }
  }

  function getDisplayName(conversation: (typeof conversations)[number]): string {
    if (conversation.type === "GROUP") {
      return conversation.name || "Group Chat";
    }
    const other = conversation.participants.find(
      (p) => p.userId !== currentUser?.id
    );
    return other?.user.nickname || "Unknown";
  }

  return (
    <div className="forward-modal-overlay" onClick={onClose}>
      <div className="forward-modal" onClick={(e) => e.stopPropagation()}>
        <div className="forward-modal-header">Forward message</div>
        <div className="forward-modal-list">
          {conversations.map((c) => {
            const name = getDisplayName(c);
            return (
              <button
                key={c.id}
                className="forward-modal-item"
                onClick={() => forwardTo(c.id)}
                disabled={sending}
              >
                <UserAvatar name={name} size="sm" />
                <span>{name}</span>
              </button>
            );
          })}
          {conversations.length === 0 && (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--ink-3)", fontSize: "13px" }}>
              No conversations
            </div>
          )}
        </div>
        <div className="forward-preview">
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Preview</div>
          <div style={{ whiteSpace: "pre-wrap" }}>
            {previewText.length > 120 ? previewText.slice(0, 120) + "\u2026" : previewText}
          </div>
        </div>
      </div>
    </div>
  );
}
