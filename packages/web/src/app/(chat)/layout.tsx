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
