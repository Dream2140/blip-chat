"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "./UserAvatar";
import { Icons } from "./Icons";
import { apiFetch } from "@/lib/api-client";
import { showToast } from "@/components/chat/Toast";
import type { User } from "@chat-app/shared";

interface NewGroupModalProps {
  onClose: () => void;
}

export function NewGroupModal({ onClose }: NewGroupModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<"search" | "name">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.users);
      }
    } catch (err) {
      console.error("[NewGroupModal] user search failed:", err);
      showToast("Search failed — please try again");
    }
  }, []);

  function toggleUser(user: User) {
    setSelected((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  }

  async function createGroup() {
    if (selected.length < 2) return;
    setLoading(true);

    try {
      const res = await apiFetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "GROUP",
          participantIds: selected.map((u) => u.id),
          name: groupName || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onClose();
        router.push(`/c/${data.conversation.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        {step === "search" ? (
          <>
            <div className="search-modal-header">
              <span style={{ fontSize: 14, fontWeight: 700 }}>New Group</span>
              <div style={{ flex: 1 }} />
              <button
                className="icon-btn"
                onClick={onClose}
                style={{ width: 28, height: 28 }}
              >
                <Icons.X />
              </button>
            </div>

            {selected.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  padding: "8px 16px",
                  flexWrap: "wrap",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                {selected.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user)}
                    style={{
                      background: "var(--primary-soft)",
                      color: "var(--primary)",
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {user.nickname}
                    <span style={{ opacity: 0.6 }}>×</span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--line)" }}>
              <input
                autoFocus
                type="text"
                placeholder="search people to add…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  search(e.target.value);
                }}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 14,
                  color: "var(--ink)",
                }}
              />
            </div>

            <div className="search-modal-results">
              {results.map((user) => {
                const isSelected = selected.some((u) => u.id === user.id);
                return (
                  <button
                    key={user.id}
                    className="search-result-item"
                    onClick={() => toggleUser(user)}
                  >
                    <UserAvatar name={user.nickname} size="sm" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {user.nickname}
                      </div>
                    </div>
                    {isSelected && (
                      <span style={{ color: "var(--primary)", fontWeight: 700 }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {selected.length >= 2 && (
              <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line)" }}>
                <button
                  onClick={() => setStep("name")}
                  style={{
                    width: "100%",
                    background: "var(--primary)",
                    color: "var(--primary-ink)",
                    borderRadius: 14,
                    padding: "10px 0",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  next — name your group
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="search-modal-header">
              <button
                className="icon-btn"
                onClick={() => setStep("search")}
                style={{ width: 28, height: 28 }}
              >
                ←
              </button>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Group Name</span>
              <div style={{ flex: 1 }} />
            </div>

            <div style={{ padding: 16 }}>
              <input
                autoFocus
                type="text"
                placeholder="give your group a name…"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 14,
                  outline: "none",
                  color: "var(--ink)",
                }}
              />

              <div
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: "var(--ink-3)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {selected.length} members selected
              </div>

              <button
                onClick={createGroup}
                disabled={loading}
                style={{
                  width: "100%",
                  marginTop: 16,
                  background: "var(--primary)",
                  color: "var(--primary-ink)",
                  borderRadius: 14,
                  padding: "10px 0",
                  fontWeight: 700,
                  fontSize: 14,
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? "creating…" : "create group"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
