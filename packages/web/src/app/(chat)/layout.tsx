"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useConversationStore } from "@/stores/conversation-store";
import { useLiveStore } from "@/stores/live-store";
import { apiFetch } from "@/lib/api-client";
import { useSocket } from "@/hooks/useSocket";
import { Sidebar } from "@/components/chat/Sidebar";
import { ToastContainer } from "@/components/chat/Toast";
import { CallOverlay } from "@/components/chat/CallOverlay";
import "@/app/chat.css";

function ConnectionBanner() {
  const connected = useLiveStore((s) => s.socketConnected);
  const [show, setShow] = useState(false);
  const [wasDisconnected, setWasDisconnected] = useState(false);

  useEffect(() => {
    if (!connected) {
      setShow(true);
      setWasDisconnected(true);
    } else if (wasDisconnected) {
      // Show "reconnected" briefly
      const timer = setTimeout(() => {
        setShow(false);
        setWasDisconnected(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [connected, wasDisconnected]);

  if (!show) return null;

  return (
    <div className={`connection-banner ${connected ? "reconnected" : "disconnected"}`}>
      <span className="conn-dot" />
      {connected ? "connected" : "connecting\u2026"}
    </div>
  );
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hasActiveChat = pathname.startsWith("/c/");
  const initialized = useRef(false);
  const { connect, disconnect } = useSocket();
  const isConnected = useLiveStore((s) => s.socketConnected);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await apiFetch("/api/conversations");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.items) {
        useConversationStore.getState().setConversations(
          data.items,
          data.hasMore ?? false,
          data.nextCursor ?? null
        );

        const totalUnread = (data.items as { unreadCount?: number }[]).reduce(
          (sum, c) => sum + (c.unreadCount ?? 0),
          0
        );
        document.title = totalUnread > 0 ? `(${totalUnread}) blip` : "blip";
      }
    } catch (err) {
      console.error("[ChatLayout] fetch conversations failed:", err);
    }
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
        if (data?.user) useAuthStore.getState().setCurrentUser(data.user);
      })
      .catch((err) => console.error("[ChatLayout] fetch current user failed:", err));

    fetchConversations();
    connect();

    // Request notification permission on first load
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl/Cmd + K → focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector(".search-input") as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fallback poll ONLY when WebSocket is disconnected AND tab is visible
  useEffect(() => {
    if (isConnected) return;

    let interval: ReturnType<typeof setInterval> | null = null;
    let attempt = 0;

    function getDelay() {
      // 30s, 45s, 67s, 100s, max 120s
      return Math.min(30000 * Math.pow(1.5, attempt), 120000);
    }

    function schedulePoll() {
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        fetchConversations();
        attempt++;
        schedulePoll(); // Reschedule with new delay
      }, getDelay());
    }

    function onVisibility() {
      if (document.hidden) {
        if (interval) { clearInterval(interval); interval = null; }
      } else {
        schedulePoll();
      }
    }

    if (!document.hidden) schedulePoll();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isConnected, fetchConversations]);

  return (
    <div className={`app-shell ${hasActiveChat ? "has-active-chat" : ""}`}>
      <Sidebar />
      <main className="chat-panel">
        <ConnectionBanner />
        {children}
      </main>
      <ToastContainer />
      <CallOverlay />
    </div>
  );
}
