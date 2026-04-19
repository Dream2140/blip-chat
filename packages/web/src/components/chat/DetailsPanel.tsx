"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useConversationStore } from "@/stores/conversation-store";
import { UserAvatar } from "./UserAvatar";
import { Icons } from "./Icons";

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

  return (
    <aside className="details-panel">
      <div className="details-hero">
        <UserAvatar name={displayName} size="lg" />
        <h2>{displayName}</h2>
        <div className="handle">@{displayName.toLowerCase()}</div>
      </div>

      <div className="quick-actions">
        <button className="quick-action"><Icons.Phone /><span>call</span></button>
        <button className="quick-action"><Icons.Video /><span>video</span></button>
        <button className="quick-action"><Icons.Mic /><span>voice</span></button>
      </div>
    </aside>
  );
}
