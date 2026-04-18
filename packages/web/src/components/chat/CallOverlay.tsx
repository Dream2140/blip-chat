"use client";

import { useCallback } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useWebRTC, webrtcCleanup } from "@/hooks/useWebRTC";
import { getGlobalSocket } from "@/hooks/useSocket";
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

export function CallOverlay() {
  const callState = useChatStore((s) => s.callState);
  const remoteNickname = useChatStore((s) => s.callRemoteNickname);
  const remoteUserId = useChatStore((s) => s.callRemoteUserId);
  const { toggleMute } = useWebRTC();

  const handleAccept = useCallback(() => {
    useChatStore.getState().acceptCall();
    if (remoteUserId) {
      emit("call:accept", { targetUserId: remoteUserId });
      // Callee waits for offer from caller (triggered by call:accept handler in useSocket)
    }
  }, [remoteUserId]);

  const handleDecline = useCallback(() => {
    if (remoteUserId) {
      emit("call:reject", { targetUserId: remoteUserId });
    }
    webrtcCleanup();
  }, [remoteUserId]);

  const handleEndCall = useCallback(() => {
    if (remoteUserId) {
      emit("call:end", { targetUserId: remoteUserId });
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
