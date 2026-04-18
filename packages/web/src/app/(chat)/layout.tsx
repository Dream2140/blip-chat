"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { apiFetch } from "@/lib/api-client";
import { Sidebar } from "@/components/chat/Sidebar";
import { ToastContainer } from "@/components/chat/Toast";
import "@/app/chat.css";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hasActiveChat = pathname.startsWith("/c/");
  const initialized = useRef(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await apiFetch("/api/conversations");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.items) {
        useChatStore.getState().setConversations(data.items);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    /* ── apply saved theme preferences ── */
    const savedTheme = localStorage.getItem("blip-theme");
    if (savedTheme) {
      document.documentElement.setAttribute("data-theme", savedTheme);
    }

    const savedAccent = localStorage.getItem("blip-accent");
    if (savedAccent) {
      const accents: Record<string, { hex: string; soft: string; gradient: string }> = {
        violet: { hex: "#6D28D9", soft: "#EDE4FF", gradient: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)" },
        pink: { hex: "#EC4899", soft: "#FDE4F0", gradient: "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)" },
        emerald: { hex: "#059669", soft: "#D1FAE5", gradient: "linear-gradient(135deg, #059669 0%, #34D399 100%)" },
        tangerine: { hex: "#EA580C", soft: "#FFEDD5", gradient: "linear-gradient(135deg, #EA580C 0%, #FB923C 100%)" },
        sky: { hex: "#0284C7", soft: "#DBEAFE", gradient: "linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)" },
      };
      const a = accents[savedAccent];
      if (a) {
        document.documentElement.style.setProperty("--primary", a.hex);
        document.documentElement.style.setProperty("--primary-soft", a.soft);
        document.documentElement.style.setProperty("--bubble-me-bg", a.gradient);
      }
    }

    const savedBubble = localStorage.getItem("blip-bubble");
    if (savedBubble) {
      const radiusMap: Record<string, string> = { asymmetric: "22px", rounded: "18px", squared: "8px" };
      const r = radiusMap[savedBubble];
      if (r) {
        document.documentElement.style.setProperty("--radius-bubble", r);
      }
    }

    apiFetch("/api/users/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) useChatStore.getState().setCurrentUser(data.user);
      })
      .catch(() => {});

    fetchConversations();
  }, [fetchConversations]);

  // Poll conversations every 5 seconds for sidebar updates
  useEffect(() => {
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  return (
    <div className={`app-shell ${hasActiveChat ? "has-active-chat" : ""}`}>
      <Sidebar />
      <main className="chat-panel">{children}</main>
      <ToastContainer />
    </div>
  );
}
