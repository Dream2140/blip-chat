"use client";

import "@/app/chat.css";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-mark">
              <div className="logo-blob" />
              <span>blip</span>
            </div>
          </div>
        </div>
        <div style={{ padding: 20, color: "var(--ink-3)", fontSize: 13 }}>
          Loading...
        </div>
      </aside>
      <main className="chat-panel">{children}</main>
    </div>
  );
}
