"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "./UserAvatar";
import { Icons } from "./Icons";
import type { User } from "@chat-app/shared";

interface SearchUsersProps {
  onClose: () => void;
}

export function SearchUsers({ onClose }: SearchUsersProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.users);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  async function startChat(userId: string) {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "DIRECT", participantIds: [userId] }),
    });

    if (res.ok) {
      const data = await res.json();
      onClose();
      router.push(`/c/${data.conversation.id}`);
    }
  }

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-modal-header">
          <Icons.Search />
          <input
            autoFocus
            type="text"
            placeholder="search people…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              search(e.target.value);
            }}
          />
          <button
            className="icon-btn"
            onClick={onClose}
            style={{ width: 28, height: 28 }}
          >
            <Icons.X />
          </button>
        </div>

        <div className="search-modal-results">
          {loading && (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--ink-3)",
                fontSize: 13,
              }}
            >
              searching…
            </div>
          )}

          {!loading && results.length === 0 && query.length >= 2 && (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--ink-3)",
                fontSize: 13,
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                nothing for &ldquo;{query}&rdquo;
              </div>
              <div style={{ marginTop: 4 }}>try a different name?</div>
            </div>
          )}

          {results.map((user) => (
            <button
              key={user.id}
              className="search-result-item"
              onClick={() => startChat(user.id)}
            >
              <UserAvatar name={user.nickname} size="sm" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {user.nickname}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--ink-3)",
                  }}
                >
                  @{user.nickname}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
