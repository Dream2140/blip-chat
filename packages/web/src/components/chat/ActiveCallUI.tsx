"use client";

import { useState, useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chat-store";
import { UserAvatar } from "./UserAvatar";
import { Icons } from "./Icons";

interface ActiveCallUIProps {
  onToggleMute: () => void;
  onEndCall: () => void;
}

export function ActiveCallUI({ onToggleMute, onEndCall }: ActiveCallUIProps) {
  const nickname = useChatStore((s) => s.callRemoteNickname) || "Unknown";
  const isMuted = useChatStore((s) => s.callIsMuted);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="call-overlay">
      <div className="call-card">
        <div className="call-status-label">on call</div>
        <div className="call-avatar-wrap">
          <UserAvatar name={nickname} size="lg" />
        </div>
        <div className="call-name">{nickname}</div>
        <div className="call-timer">{timeStr}</div>
        <div className="call-actions">
          <button
            className={`call-btn neutral${isMuted ? " active" : ""}`}
            onClick={onToggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            <Icons.Mic />
          </button>
          <button className="call-btn neutral" aria-label="Speaker">
            <span style={{ fontSize: 18 }}>🔊</span>
          </button>
          <button className="call-btn decline" onClick={onEndCall} aria-label="End call">
            <Icons.Phone />
          </button>
        </div>
      </div>
    </div>
  );
}
