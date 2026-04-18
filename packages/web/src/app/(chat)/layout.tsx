"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { useChatStore } from "@/stores/chat-store";
import { Sidebar } from "@/components/chat/Sidebar";
import { DetailsPanel } from "@/components/chat/DetailsPanel";
import "@/app/chat.css";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { connect, disconnect } = useSocket();
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
      });

    fetch("/api/conversations")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items) useChatStore.getState().setConversations(data.items);
      });

    connect();

    return () => {
      disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`app-shell ${hasActiveChat ? "has-active-chat" : ""}`}>
      <Sidebar />
      <main className="chat-panel">{children}</main>
      <DetailsPanel />
    </div>
  );
}
