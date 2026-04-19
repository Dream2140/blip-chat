"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useConversationStore } from "@/stores/conversation-store";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "./Toast";
import { UserAvatar } from "./UserAvatar";
import { Icons } from "./Icons";
import { GroupAdminPanel } from "./GroupAdminPanel";

export function DetailsPanel() {
  const activeConversationId = useConversationStore((s) => s.activeConversationId);
  const currentUser = useAuthStore((s) => s.currentUser);
  const conversation = useConversationStore((s) =>
    s.conversations.find((c) => c.id === activeConversationId)
  );

  const toast = useToast((s) => s.show);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const otherUserIdForBlock =
    conversation?.type === "DIRECT"
      ? conversation.participants.find((p) => p.userId !== currentUser?.id)?.userId
      : null;

  // Check block status when viewing a DM conversation
  useEffect(() => {
    if (!otherUserIdForBlock) return;
    apiFetch(`/api/users/${otherUserIdForBlock}/block`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setIsBlocked(data.blocked);
      })
      .catch(() => {});
  }, [otherUserIdForBlock]);

  const handleToggleBlock = useCallback(async () => {
    if (!otherUserIdForBlock) return;
    setBlockLoading(true);
    try {
      const method = isBlocked ? "DELETE" : "POST";
      const res = await apiFetch(`/api/users/${otherUserIdForBlock}/block`, { method });
      if (res.ok) {
        const data = await res.json();
        setIsBlocked(data.blocked);
        toast(data.blocked ? "User blocked" : "User unblocked", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to update block", "error");
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setBlockLoading(false);
    }
  }, [otherUserIdForBlock, isBlocked, toast]);

  if (!conversation) return <aside className="details-panel" />;

  const otherParticipant =
    conversation.type === "DIRECT"
      ? conversation.participants.find((p) => p.userId !== currentUser?.id)
      : null;

  const displayName =
    conversation.type === "GROUP"
      ? conversation.name || "Group Chat"
      : otherParticipant?.user.nickname || "Unknown";

  const isGroup = conversation.type === "GROUP";

  return (
    <aside className="details-panel">
      <div className="details-hero">
        <UserAvatar name={displayName} size="lg" isGroup={isGroup} />
        <h2>{displayName}</h2>
        {isGroup ? (
          <div className="handle">{conversation.participants.length} members</div>
        ) : (
          <div className="handle">@{displayName.toLowerCase()}</div>
        )}
      </div>

      <div className="quick-actions">
        <button className="quick-action"><Icons.Phone /><span>call</span></button>
        <button className="quick-action"><Icons.Video /><span>video</span></button>
        <button className="quick-action"><Icons.Mic /><span>voice</span></button>
      </div>

      {isGroup && activeConversationId && (
        <GroupAdminPanel conversationId={activeConversationId} />
      )}

      {!isGroup && otherUserIdForBlock && (
        <div style={{ padding: "16px 20px", marginTop: "auto" }}>
          <button
            onClick={handleToggleBlock}
            disabled={blockLoading}
            style={{
              width: "100%",
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 12,
              background: isBlocked ? "var(--bg-sunk)" : "var(--danger, #ef4444)",
              color: isBlocked ? "var(--ink-2)" : "white",
              opacity: blockLoading ? 0.5 : 1,
              cursor: blockLoading ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {blockLoading
              ? "..."
              : isBlocked
                ? "Unblock user"
                : "Block user"}
          </button>
        </div>
      )}
    </aside>
  );
}
