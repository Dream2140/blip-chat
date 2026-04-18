"use client";

import { create } from "zustand";
import type { User, Conversation, Message } from "@chat-app/shared";

interface ChatStore {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  conversations: Conversation[];
  activeConversationId: string | null;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversationId: (id: string | null) => void;
  updateConversation: (id: string, update: Partial<Conversation>) => void;
  addConversation: (conversation: Conversation) => void;

  messagesByConversation: Record<string, Message[]>;
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, update: Partial<Message>) => void;
  removeMessage: (conversationId: string, messageId: string) => void;

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
}

export const useChatStore = create<ChatStore>((set, get) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  conversations: [],
  activeConversationId: null,
  setConversations: (conversations) => set({ conversations }),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  updateConversation: (id, update) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...update } : c
      ),
    })),
  addConversation: (conversation) =>
    set((state) => {
      if (state.conversations.find((c) => c.id === conversation.id)) return state;
      return { conversations: [conversation, ...state.conversations] };
    }),

  messagesByConversation: {},
  setMessages: (conversationId, messages) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: messages,
      },
    })),
  addMessage: (conversationId, message) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [
          ...(state.messagesByConversation[conversationId] || []),
          message,
        ],
      },
    })),
  updateMessage: (conversationId, messageId, update) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: (
          state.messagesByConversation[conversationId] || []
        ).map((m) => (m.id === messageId ? { ...m, ...update } : m)),
      },
    })),
  removeMessage: (conversationId, messageId) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: (
          state.messagesByConversation[conversationId] || []
        ).map((m) =>
          m.id === messageId
            ? { ...m, deletedAt: new Date().toISOString() }
            : m
        ),
      },
    })),

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
}));
