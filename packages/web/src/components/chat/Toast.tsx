"use client";

import { create } from "zustand";

interface ToastState {
  message: string | null;
  type: "error" | "success" | "info";
  show: (message: string, type?: "error" | "success" | "info") => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  type: "info",
  show: (message, type = "error") => {
    set({ message, type });
    setTimeout(() => set({ message: null }), 4000);
  },
  hide: () => set({ message: null }),
}));

export function showToast(message: string, type?: "error" | "success" | "info") {
  useToast.getState().show(message, type);
}

export function ToastContainer() {
  const message = useToast((s) => s.message);
  const type = useToast((s) => s.type);

  if (!message) return null;

  const bg =
    type === "error"
      ? "linear-gradient(135deg, #E11D48, #F43F5E)"
      : type === "success"
        ? "linear-gradient(135deg, #059669, #10B981)"
        : "var(--bubble-me-bg)";

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 1000,
        background: bg,
        color: "white",
        padding: "12px 20px",
        borderRadius: 14,
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "var(--shadow-pop)",
        animation: "pop-in 0.3s ease",
        maxWidth: 360,
      }}
    >
      {message}
    </div>
  );
}
