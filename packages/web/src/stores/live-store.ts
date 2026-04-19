"use client";

import { create } from "zustand";

const typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

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
  callIsInitiator: boolean;
  callStartedAt: number | null;
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
  setUserTyping: (conversationId, userId) => {
    const key = `${conversationId}:${userId}`;

    // Clear existing timeout
    const existing = typingTimeouts.get(key);
    if (existing) clearTimeout(existing);

    // Auto-clear after 6 seconds
    typingTimeouts.set(key, setTimeout(() => {
      useLiveStore.getState().clearUserTyping(conversationId, userId);
      typingTimeouts.delete(key);
    }, 6000));

    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      if (current.includes(userId)) return state;
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: [...current, userId],
        },
      };
    });
  },
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
  callIsInitiator: false,
  callStartedAt: null,
  startCall: (userId, nickname) =>
    set({ callState: "calling", callRemoteUserId: userId, callRemoteNickname: nickname, callIsInitiator: true }),
  receiveCall: (callerId, callerNickname) =>
    set({ callState: "incoming", callRemoteUserId: callerId, callRemoteNickname: callerNickname, callIsInitiator: false }),
  acceptCall: () => set({ callState: "active", callStartedAt: Date.now() }),
  endCall: () =>
    set({ callState: "idle", callRemoteUserId: null, callRemoteNickname: null, callIsMuted: false, callIsInitiator: false, callStartedAt: null }),
  toggleMute: () => set((state) => ({ callIsMuted: !state.callIsMuted })),
}));
