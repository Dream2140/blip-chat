"use client";

import { useChatStore } from "@/stores/chat-store";
import { UserAvatar } from "./UserAvatar";
import { Icons } from "./Icons";

export function DetailsPanel() {
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const currentUser = useChatStore((s) => s.currentUser);
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);
  const conversation = useChatStore((s) =>
    s.conversations.find((c) => c.id === activeConversationId)
  );

  if (!conversation) return <aside className="details-panel" />;

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

  return (
    <aside className="details-panel">
      <div className="details-hero">
        <UserAvatar name={displayName} size="lg" isOnline={isOnline} />
        <h2>{displayName}</h2>
        <div className="handle">
          @{displayName.toLowerCase()} · {isOnline ? "online" : "offline"}
        </div>
      </div>

      <div className="quick-actions">
        <button className="quick-action">
          <Icons.Phone />
          <span>call</span>
        </button>
        <button className="quick-action">
          <Icons.Video />
          <span>video</span>
        </button>
        <button className="quick-action">
          <Icons.Mic />
          <span>voice</span>
        </button>
      </div>

      {conversation.type === "GROUP" && (
        <div className="details-section">
          <h3>members · {conversation.participants.length}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {conversation.participants.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                <UserAvatar
                  name={p.user.nickname}
                  size="sm"
                  isOnline={onlineUserIds.has(p.userId)}
                />
                <span style={{ fontWeight: 600 }}>{p.user.nickname}</span>
                {p.role === "ADMIN" && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--primary)",
                      fontWeight: 700,
                    }}
                  >
                    admin
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
