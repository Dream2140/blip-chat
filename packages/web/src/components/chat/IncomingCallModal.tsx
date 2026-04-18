"use client";

import { useChatStore } from "@/stores/chat-store";
import { UserAvatar } from "./UserAvatar";
import { Icons } from "./Icons";

interface IncomingCallModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallModal({ onAccept, onDecline }: IncomingCallModalProps) {
  const nickname = useChatStore((s) => s.callRemoteNickname) || "Unknown";

  return (
    <div className="call-overlay">
      <div className="call-card">
        <div className="call-avatar-wrap call-avatar-pulse">
          <UserAvatar name={nickname} size="lg" />
        </div>
        <div className="call-name">{nickname}</div>
        <div className="call-label">incoming &middot; audio</div>
        <div className="call-actions">
          <button className="call-btn decline" onClick={onDecline} aria-label="Decline call">
            <Icons.X />
          </button>
          <button className="call-btn neutral" aria-label="Send message">
            <span style={{ fontSize: 18 }}>💬</span>
          </button>
          <button className="call-btn accept" onClick={onAccept} aria-label="Accept call">
            <Icons.Phone />
          </button>
        </div>
      </div>
    </div>
  );
}
