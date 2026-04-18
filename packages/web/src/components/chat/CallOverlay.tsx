"use client";

import { useCallback, useEffect } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useSocket } from "@/hooks/useSocket";
import { IncomingCallModal } from "./IncomingCallModal";
import { ActiveCallUI } from "./ActiveCallUI";
import { UserAvatar } from "./UserAvatar";
import { Icons } from "./Icons";

export function CallOverlay() {
  const callState = useChatStore((s) => s.callState);
  const remoteNickname = useChatStore((s) => s.callRemoteNickname);
  const remoteUserId = useChatStore((s) => s.callRemoteUserId);
  const { startCall, handleOffer, handleAnswer, handleIceCandidate, toggleMute, cleanup } = useWebRTC();
  const { getSocket } = useSocket();

  const emit = useCallback(
    (event: string, data: unknown) => {
      const socket = getSocket();
      if (socket) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (socket as any).emit(event, data);
      }
    },
    [getSocket],
  );

  // Register window-level handlers for WebRTC signaling events from socket
  useEffect(() => {
    const win = window as unknown as Record<string, unknown>;

    win.__blipCallAcceptHandler = (data: { callerId: string }) => {
      // Caller side: the remote accepted, start WebRTC offer exchange
      const targetId = useChatStore.getState().callRemoteUserId;
      if (targetId) {
        startCall(emit, targetId);
      }
    };

    win.__blipCallOfferHandler = (data: { sdp: string; callerId: string }) => {
      handleOffer(emit, data.callerId, data.sdp);
    };

    win.__blipCallAnswerHandler = (data: { sdp: string }) => {
      handleAnswer(data.sdp);
    };

    win.__blipCallIceCandidateHandler = (data: { candidate: string }) => {
      handleIceCandidate(data.candidate);
    };

    return () => {
      delete win.__blipCallAcceptHandler;
      delete win.__blipCallOfferHandler;
      delete win.__blipCallAnswerHandler;
      delete win.__blipCallIceCandidateHandler;
    };
  }, [emit, startCall, handleOffer, handleAnswer, handleIceCandidate]);

  const handleAccept = useCallback(() => {
    useChatStore.getState().acceptCall();
    if (remoteUserId) {
      emit("call:accept", { targetUserId: remoteUserId });
      // The caller will send an offer; we wait for it via socket listener
    }
  }, [remoteUserId, emit]);

  const handleDecline = useCallback(() => {
    if (remoteUserId) {
      emit("call:reject", { targetUserId: remoteUserId });
    }
    cleanup();
  }, [remoteUserId, emit, cleanup]);

  const handleEndCall = useCallback(() => {
    if (remoteUserId) {
      emit("call:end", { targetUserId: remoteUserId });
    }
    cleanup();
  }, [remoteUserId, emit, cleanup]);

  const handleCancelCall = useCallback(() => {
    if (remoteUserId) {
      emit("call:end", { targetUserId: remoteUserId });
    }
    cleanup();
  }, [remoteUserId, emit, cleanup]);

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
            <button className="call-btn decline" onClick={handleCancelCall} aria-label="Cancel call">
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
