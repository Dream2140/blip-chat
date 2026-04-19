"use client";

import { useCallback } from "react";
import { useLiveStore } from "@/stores/live-store";
import { useConversationStore } from "@/stores/conversation-store";
import { useWebRTC, webrtcCleanup } from "@/hooks/useWebRTC";
import { getGlobalSocket } from "@/hooks/useSocket";
import { apiFetch } from "@/lib/api-client";
import { IncomingCallModal } from "./IncomingCallModal";
import { ActiveCallUI } from "./ActiveCallUI";
import { UserAvatar } from "./UserAvatar";
import { Icons } from "./Icons";

function emit(event: string, data: unknown) {
  const socket = getGlobalSocket();
  if (socket) {
    (socket as { emit: (e: string, d: unknown) => void }).emit(event, data);
  }
}

async function saveCallMessage(type: "completed" | "missed" | "cancelled", duration?: number) {
  const conversations = useConversationStore.getState().conversations;
  const remoteId = useLiveStore.getState().callRemoteUserId;

  if (!remoteId) return;

  const conv = conversations.find(
    (c) => c.type === "DIRECT" && c.participants.some((p) => p.userId === remoteId)
  );
  if (!conv) return;

  const callData = JSON.stringify({ type, duration: duration || 0 });
  await apiFetch(`/api/conversations/${conv.id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: `__CALL:${callData}` }),
  }).catch(() => {});
}

export function CallOverlay() {
  const callState = useLiveStore((s) => s.callState);
  const remoteNickname = useLiveStore((s) => s.callRemoteNickname);
  const remoteUserId = useLiveStore((s) => s.callRemoteUserId);
  const { toggleMute } = useWebRTC();

  const handleAccept = useCallback(() => {
    useLiveStore.getState().acceptCall();
    if (remoteUserId) {
      emit("call:accept", { targetUserId: remoteUserId });
      // Callee waits for offer from caller (triggered by call:accept handler in useSocket)
    }
  }, [remoteUserId]);

  const handleDecline = useCallback(() => {
    if (remoteUserId) {
      emit("call:reject", { targetUserId: remoteUserId });
    }
    // Callee declining — the caller will receive call:reject and save the "missed" message
    webrtcCleanup();
  }, [remoteUserId]);

  const handleEndCall = useCallback(() => {
    const state = useLiveStore.getState();
    const isInitiator = state.callIsInitiator;
    const currentCallState = state.callState;
    const startedAt = state.callStartedAt;

    if (remoteUserId) {
      emit("call:end", { targetUserId: remoteUserId });
    }

    // Only the initiator saves the call message to avoid duplicates
    if (isInitiator) {
      if (currentCallState === "active" && startedAt) {
        const duration = Math.round((Date.now() - startedAt) / 1000);
        saveCallMessage("completed", duration);
      } else if (currentCallState === "calling") {
        saveCallMessage("cancelled");
      }
    }

    webrtcCleanup();
  }, [remoteUserId]);

  if (callState === "idle") return null;

  if (callState === "calling") {
    return (
      <div className="call-overlay">
        <div className="call-card">
          <div className="call-avatar-wrap call-avatar-pulse">
            <UserAvatar name={remoteNickname || "Unknown"} size="lg" />
          </div>
          <div className="call-name">{remoteNickname || "Unknown"}</div>
          <div className="call-label">calling...</div>
          <div className="call-actions">
            <button className="call-btn decline" onClick={handleEndCall} aria-label="Cancel call">
              <Icons.X />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (callState === "incoming") {
    return <IncomingCallModal onAccept={handleAccept} onDecline={handleDecline} />;
  }

  if (callState === "active") {
    return <ActiveCallUI onToggleMute={toggleMute} onEndCall={handleEndCall} />;
  }

  return null;
}
