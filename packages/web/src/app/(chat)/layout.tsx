"use client";

import { useEffect } from "react";
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
  const setConversations = useChatStore((s) => s.setConversations);
  const setCurrentUser = useChatStore((s) => s.setCurrentUser);
  const pathname = usePathname();

  const hasActiveChat = pathname.startsWith("/c/");

  useEffect(() => {
    fetch("/api/users/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      });

    fetch("/api/conversations")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items) setConversations(data.items);
      });

    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect, setConversations, setCurrentUser]);

  return (
    <div className={`app-shell ${hasActiveChat ? "has-active-chat" : ""}`}>
      <Sidebar />
      <main className="chat-panel">{children}</main>
      <DetailsPanel />
    </div>
  );
}
