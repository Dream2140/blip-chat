"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useConversationStore } from "@/stores/conversation-store";
import { UserAvatar } from "./UserAvatar";
import { Icons } from "./Icons";
import { GroupAdminPanel } from "./GroupAdminPanel";

export function DetailsPanel() {
  const activeConversationId = useConversationStore((s) => s.activeConversationId);
  const currentUser = useAuthStore((s) => s.currentUser);
  const conversation = useConversationStore((s) =>
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
    </aside>
  );
}
