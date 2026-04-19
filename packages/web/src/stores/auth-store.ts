"use client";

import { create } from "zustand";
import type { User } from "@chat-app/shared";

interface AuthStore {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
}));
