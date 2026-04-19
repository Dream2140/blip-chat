"use client";

import { create } from "zustand";

interface LiveStore {
  // Use Record instead of Set — Sets cause re-render loops in React 19 + Zustand v5
  onlineUserIds: Record<string, boolean>;
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
  isUserOnline: (userId: string) => boolean;

  typingUsers: Record<string, string[]>;
  setUserTyping: (conversationId: string, userId: string) => void;
  clearUserTyping: (conversationId: string, userId: string) => void;

  socketConnected: boolean;
  setSocketConnected: (v: boolean) => void;

  // Call state
  callState: "idle" | "calling" | "incoming" | "active";
  callRemoteUserId: string | null;
  callRemoteNickname: string | null;
  callIsMuted: boolean;
  startCall: (userId: string, nickname: string) => void;
  receiveCall: (callerId: string, callerNickname: string) => void;
  acceptCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
}

export const useLiveStore = create<LiveStore>((set, get) => ({
  onlineUserIds: {},
  setUserOnline: (userId) =>
    set((state) => {
      if (state.onlineUserIds[userId]) return state; // no change
      return { onlineUserIds: { ...state.onlineUserIds, [userId]: true } };
    }),
  setUserOffline: (userId) =>
    set((state) => {
      if (!state.onlineUserIds[userId]) return state; // no change
      const next = { ...state.onlineUserIds };
      delete next[userId];
      return { onlineUserIds: next };
    }),
  isUserOnline: (userId) => !!get().onlineUserIds[userId],

  typingUsers: {},
  setUserTyping: (conversationId, userId) =>
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      if (current.includes(userId)) return state;
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: [...current, userId],
        },
      };
    }),
  clearUserTyping: (conversationId, userId) =>
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      if (!current.includes(userId)) return state;
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: current.filter((id) => id !== userId),
        },
      };
    }),

  socketConnected: false,
  setSocketConnected: (v) => set({ socketConnected: v }),

  // Call state
  callState: "idle",
  callRemoteUserId: null,
  callRemoteNickname: null,
  callIsMuted: false,
  startCall: (userId, nickname) =>
    set({ callState: "calling", callRemoteUserId: userId, callRemoteNickname: nickname }),
  receiveCall: (callerId, callerNickname) =>
    set({ callState: "incoming", callRemoteUserId: callerId, callRemoteNickname: callerNickname }),
  acceptCall: () => set({ callState: "active" }),
  endCall: () =>
    set({ callState: "idle", callRemoteUserId: null, callRemoteNickname: null, callIsMuted: false }),
  toggleMute: () => set((state) => ({ callIsMuted: !state.callIsMuted })),
}));
