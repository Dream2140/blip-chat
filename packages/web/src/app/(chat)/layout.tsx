"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { Sidebar } from "@/components/chat/Sidebar";
import "@/app/chat.css";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hasActiveChat = pathname.startsWith("/c/");
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    fetch("/api/users/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) useChatStore.getState().setCurrentUser(data.user);
      })
      .catch(() => {});

    fetch("/api/conversations")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items) useChatStore.getState().setConversations(data.items);
      })
      .catch(() => {});
  }, []);

  return (
    <div className={`app-shell ${hasActiveChat ? "has-active-chat" : ""}`}>
      <Sidebar />
      <main className="chat-panel">{children}</main>
    </div>
  );
}
