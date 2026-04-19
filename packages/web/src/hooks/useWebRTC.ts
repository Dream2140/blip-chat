"use client";

import { useCallback } from "react";
import { useLiveStore } from "@/stores/live-store";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// Module-level state — shared across all hook instances
let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteAudio: HTMLAudioElement | null = null;
let pendingCandidates: RTCIceCandidateInit[] = [];

async function getLocalStream(): Promise<MediaStream> {
  if (localStream) return localStream;
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return localStream;
}

function getEmit(): ((event: string, data: unknown) => void) | null {
  // Import dynamically to avoid circular deps
  const { getGlobalSocket } = require("@/hooks/useSocket");
  const socket = getGlobalSocket();
  if (!socket) return null;
  return (event: string, data: unknown) => {
    (socket as { emit: (e: string, d: unknown) => void }).emit(event, data);
  };
}

function ensureAudioElement(): HTMLAudioElement {
  if (!remoteAudio) {
    remoteAudio = document.createElement("audio");
    remoteAudio.autoplay = true;
    (remoteAudio as unknown as Record<string, boolean>).playsInline = true;
    // Append to DOM to help with autoplay policy
    remoteAudio.style.display = "none";
    document.body.appendChild(remoteAudio);
  }
  return remoteAudio;
}

function createPC(targetUserId: string): RTCPeerConnection {
  if (pc) {
    pc.close();
  }
  pendingCandidates = [];

  const conn = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  conn.ontrack = (event) => {
    console.log("[WebRTC] remote track received");
    const audio = ensureAudioElement();
    audio.srcObject = event.streams[0];
    audio.play().catch((e) => console.warn("[WebRTC] audio play blocked:", e));
  };

  conn.onicecandidate = (event) => {
    if (event.candidate) {
      const emit = getEmit();
      if (emit) {
        emit("call:ice_candidate", {
          targetUserId,
          candidate: JSON.stringify(event.candidate),
        });
      }
    }
  };

  conn.oniceconnectionstatechange = () => {
    console.log("[WebRTC] ICE state:", conn.iceConnectionState);
    if (conn.iceConnectionState === "connected" || conn.iceConnectionState === "completed") {
      useLiveStore.getState().acceptCall();
    }
    if (conn.iceConnectionState === "failed" || conn.iceConnectionState === "disconnected") {
      console.warn("[WebRTC] connection failed/disconnected");
    }
  };

  pc = conn;
  return conn;
}

// Called by CALLER after callee accepts
export async function webrtcStartOffer(targetUserId: string) {
  try {
    console.log("[WebRTC] creating offer for", targetUserId);
    const stream = await getLocalStream();
    const conn = createPC(targetUserId);

    stream.getTracks().forEach((track) => conn.addTrack(track, stream));

    const offer = await conn.createOffer();
    await conn.setLocalDescription(offer);

    const emit = getEmit();
    if (emit) {
      emit("call:offer", {
        targetUserId,
        sdp: JSON.stringify(offer),
      });
    }
  } catch (e) {
    console.error("[WebRTC] startOffer failed:", e);
  }
}

// Called by CALLEE when receiving offer
export async function webrtcHandleOffer(targetUserId: string, sdp: string) {
  try {
    console.log("[WebRTC] handling offer from", targetUserId);
    const stream = await getLocalStream();
    const conn = createPC(targetUserId);

    stream.getTracks().forEach((track) => conn.addTrack(track, stream));

    await conn.setRemoteDescription(new RTCSessionDescription(JSON.parse(sdp)));

    // Process any ICE candidates that arrived before the offer
    for (const c of pendingCandidates) {
      await conn.addIceCandidate(new RTCIceCandidate(c));
    }
    pendingCandidates = [];

    const answer = await conn.createAnswer();
    await conn.setLocalDescription(answer);

    const emit = getEmit();
    if (emit) {
      emit("call:answer", {
        targetUserId,
        sdp: JSON.stringify(answer),
      });
    }
  } catch (e) {
    console.error("[WebRTC] handleOffer failed:", e);
  }
}

// Called by CALLER when receiving answer
export async function webrtcHandleAnswer(sdp: string) {
  try {
    console.log("[WebRTC] handling answer");
    if (pc && pc.signalingState === "have-local-offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(sdp)));

      // Process queued ICE candidates
      for (const c of pendingCandidates) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }
      pendingCandidates = [];
    }
  } catch (e) {
    console.error("[WebRTC] handleAnswer failed:", e);
  }
}

// Called when receiving ICE candidate
export async function webrtcHandleIceCandidate(candidate: string) {
  try {
    const parsed = JSON.parse(candidate);
    if (pc && pc.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(parsed));
    } else {
      // Queue if remote description not set yet
      pendingCandidates.push(parsed);
    }
  } catch (e) {
    console.error("[WebRTC] handleIceCandidate failed:", e);
  }
}

export function webrtcCleanup() {
  localStream?.getTracks().forEach((t) => t.stop());
  localStream = null;
  pc?.close();
  pc = null;
  pendingCandidates = [];
  if (remoteAudio) {
    remoteAudio.srcObject = null;
    remoteAudio.remove();
    remoteAudio = null;
  }
  useLiveStore.getState().endCall();
}

// Hook wrapper for components
export function useWebRTC() {
  const toggleMute = useCallback(() => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        useLiveStore.getState().toggleMute();
      }
    }
  }, []);

  return {
    toggleMute,
    cleanup: webrtcCleanup,
  };
}
