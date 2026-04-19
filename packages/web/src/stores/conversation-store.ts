"use client";

import { create } from "zustand";
import type { Conversation, Message } from "@chat-app/shared";

interface ConversationStore {
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
}

export const useConversationStore = create<ConversationStore>((set) => ({
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
}));
