"use client";

import { create } from "zustand";
import type { Conversation, Message } from "@chat-app/shared";

interface ConversationStore {
  conversations: Conversation[];
  conversationsLoaded: boolean;
  hasMoreConversations: boolean;
  conversationsCursor: string | null;
  activeConversationId: string | null;
  setConversations: (conversations: Conversation[], hasMore?: boolean, cursor?: string | null) => void;
  appendConversations: (conversations: Conversation[], hasMore: boolean, cursor: string | null) => void;
  setActiveConversationId: (id: string | null) => void;
  updateConversation: (id: string, update: Partial<Conversation>) => void;
  addConversation: (conversation: Conversation) => void;
  removeConversation: (id: string) => void;

  incrementUnread: (conversationId: string) => void;
  clearUnread: (conversationId: string) => void;

  drafts: Record<string, string>;
  setDraft: (conversationId: string, text: string) => void;
  clearDraft: (conversationId: string) => void;

  messagesByConversation: Record<string, Message[]>;
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, update: Partial<Message>) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
}

export const useConversationStore = create<ConversationStore>((set) => ({
  conversations: [],
  conversationsLoaded: false,
  hasMoreConversations: false,
  conversationsCursor: null,
  activeConversationId: null,
  setConversations: (conversations, hasMore = false, cursor = null) =>
    set({ conversations, conversationsLoaded: true, hasMoreConversations: hasMore, conversationsCursor: cursor }),
  appendConversations: (conversations, hasMore, cursor) =>
    set((state) => {
      const existingIds = new Set(state.conversations.map((c) => c.id));
      const newConvos = conversations.filter((c) => !existingIds.has(c.id));
      return {
        conversations: [...state.conversations, ...newConvos],
        hasMoreConversations: hasMore,
        conversationsCursor: cursor,
      };
    }),
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
  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversationId:
        state.activeConversationId === id ? null : state.activeConversationId,
    })),
  incrementUnread: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
      ),
    })),
  clearUnread: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
    })),

  drafts: {},
  setDraft: (conversationId, text) =>
    set((state) => ({
      drafts: { ...state.drafts, [conversationId]: text },
    })),
  clearDraft: (conversationId) =>
    set((state) => {
      const next = { ...state.drafts };
      delete next[conversationId];
      return { drafts: next };
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
}));
