"use client";

import { useRef, useCallback } from "react";
import { useChatStore } from "@/stores/chat-store";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function useWebRTC() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const getLocalStream = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;
    return stream;
  };

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.ontrack = (event) => {
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = event.streams[0];
    };

    pcRef.current = pc;
    return pc;
  }, []);

  const startCall = useCallback(
    async (
      socketEmit: (event: string, data: unknown) => void,
      targetUserId: string,
    ) => {
      const stream = await getLocalStream();
      const pc = createPeerConnection();

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketEmit("call:ice_candidate", {
            targetUserId,
            candidate: JSON.stringify(event.candidate),
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketEmit("call:offer", {
        targetUserId,
        sdp: JSON.stringify(offer),
      });
    },
    [createPeerConnection],
  );

  const handleOffer = useCallback(
    async (
      socketEmit: (event: string, data: unknown) => void,
      targetUserId: string,
      sdp: string,
    ) => {
      const stream = await getLocalStream();
      const pc = createPeerConnection();

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketEmit("call:ice_candidate", {
            targetUserId,
            candidate: JSON.stringify(event.candidate),
          });
        }
      };

      await pc.setRemoteDescription(JSON.parse(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketEmit("call:answer", {
        targetUserId,
        sdp: JSON.stringify(answer),
      });
    },
    [createPeerConnection],
  );

  const handleAnswer = useCallback(async (sdp: string) => {
    if (pcRef.current) {
      await pcRef.current.setRemoteDescription(JSON.parse(sdp));
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate: string) => {
    if (pcRef.current) {
      await pcRef.current.addIceCandidate(JSON.parse(candidate));
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        useChatStore.getState().toggleMute();
      }
    }
  }, []);

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }
    useChatStore.getState().endCall();
  }, []);

  return {
    startCall,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    toggleMute,
    cleanup,
  };
}
