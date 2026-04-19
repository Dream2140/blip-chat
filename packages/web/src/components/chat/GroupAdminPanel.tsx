"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useConversationStore } from "@/stores/conversation-store";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "./Toast";
import { UserAvatar } from "./UserAvatar";
import { Icons } from "./Icons";
import type { User } from "@chat-app/shared";

interface GroupAdminPanelProps {
  conversationId: string;
}

export function GroupAdminPanel({ conversationId }: GroupAdminPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const currentUser = useAuthStore((s) => s.currentUser);
  const conversation = useConversationStore((s) =>
    s.conversations.find((c) => c.id === conversationId)
  );

  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  if (!conversation || conversation.type !== "GROUP") return null;

  const myParticipant = conversation.participants.find(
    (p) => p.userId === currentUser?.id
  );
  const isAdmin = myParticipant?.role === "ADMIN";

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(q)}`
        );
        if (res.ok) {
          const data = await res.json();
          // Filter out users already in the conversation
          const existingIds = new Set(
            conversation.participants.map((p) => p.userId)
          );
          setSearchResults(
            data.users.filter((u: User) => !existingIds.has(u.id))
          );
        }
      } finally {
        setSearchLoading(false);
      }
    },
    [conversation.participants]
  );

  async function handleAddMember(userId: string) {
    setAddingUserId(userId);
    try {
      const res = await apiFetch(
        `/api/conversations/${conversationId}/participants`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: [userId] }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        useConversationStore
          .getState()
          .updateConversation(conversationId, {
            participants: data.conversation.participants,
          });
        // Remove the added user from search results
        setSearchResults((prev) => prev.filter((u) => u.id !== userId));
        toast.show("Member added", "success");
      } else {
        const err = await res.json().catch(() => null);
        toast.show(err?.error || "Failed to add member", "error");
      }
    } catch {
      toast.show("Network error", "error");
    } finally {
      setAddingUserId(null);
    }
  }

  async function handleRemoveMember(userId: string) {
    setRemovingUserId(userId);
    try {
      const res = await apiFetch(
        `/api/conversations/${conversationId}/participants/${userId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        const currentConv = useConversationStore
          .getState()
          .conversations.find((c) => c.id === conversationId);
        if (currentConv) {
          useConversationStore.getState().updateConversation(conversationId, {
            participants: currentConv.participants.filter(
              (p) => p.userId !== userId
            ),
          });
        }
        toast.show("Member removed", "success");
      } else {
        const err = await res.json().catch(() => null);
        toast.show(err?.error || "Failed to remove member", "error");
      }
    } catch {
      toast.show("Network error", "error");
    } finally {
      setRemovingUserId(null);
    }
  }

  async function handleLeaveGroup() {
    if (!currentUser) return;
    setLeaving(true);
    try {
      const res = await apiFetch(
        `/api/conversations/${conversationId}/participants/${currentUser.id}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        useConversationStore.getState().removeConversation(conversationId);
        router.push("/");
        toast.show("Left group", "success");
      } else {
        const err = await res.json().catch(() => null);
        toast.show(err?.error || "Failed to leave group", "error");
      }
    } catch {
      toast.show("Network error", "error");
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div className="details-section">
      <h3>Members ({conversation.participants.length})</h3>

      <div className="member-list">
        {conversation.participants.map((p) => (
          <div key={p.id} className="member-item">
            <UserAvatar name={p.user.nickname} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.user.nickname}
                  {p.userId === currentUser?.id ? " (you)" : ""}
                </span>
                {p.role === "ADMIN" && (
                  <span className="admin-badge">admin</span>
                )}
              </div>
            </div>
            {isAdmin && p.userId !== currentUser?.id && (
              <button
                className="icon-btn"
                style={{ width: 28, height: 28, color: "var(--pink)" }}
                onClick={() => handleRemoveMember(p.userId)}
                disabled={removingUserId === p.userId}
                title="Remove member"
              >
                {removingUserId === p.userId ? (
                  <span style={{ fontSize: 11 }}>...</span>
                ) : (
                  <Icons.X />
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <div style={{ marginTop: 12 }}>
          {!showAddMember ? (
            <button
              className="member-item"
              style={{
                width: "100%",
                cursor: "pointer",
                color: "var(--primary)",
                fontWeight: 600,
                fontSize: 13,
                border: "none",
                background: "none",
              }}
              onClick={() => setShowAddMember(true)}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "var(--primary-soft)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icons.Plus />
              </div>
              <span>Add member</span>
            </button>
          ) : (
            <div
              style={{
                background: "var(--bg-elev)",
                borderRadius: 14,
                padding: 10,
                border: "1px solid var(--line)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <Icons.Search />
                <input
                  autoFocus
                  type="text"
                  placeholder="search people..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    search(e.target.value);
                  }}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: 13,
                    color: "var(--ink)",
                  }}
                />
                <button
                  className="icon-btn"
                  style={{ width: 24, height: 24 }}
                  onClick={() => {
                    setShowAddMember(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                >
                  <Icons.X />
                </button>
              </div>

              {searchLoading && (
                <div
                  style={{
                    padding: 12,
                    textAlign: "center",
                    color: "var(--ink-3)",
                    fontSize: 12,
                  }}
                >
                  searching...
                </div>
              )}

              {!searchLoading &&
                searchResults.length === 0 &&
                searchQuery.length >= 2 && (
                  <div
                    style={{
                      padding: 12,
                      textAlign: "center",
                      color: "var(--ink-3)",
                      fontSize: 12,
                    }}
                  >
                    no users found
                  </div>
                )}

              {searchResults.map((user) => (
                <button
                  key={user.id}
                  className="member-item"
                  style={{
                    width: "100%",
                    cursor: "pointer",
                    border: "none",
                    background: "none",
                    color: "var(--ink)",
                  }}
                  onClick={() => handleAddMember(user.id)}
                  disabled={addingUserId === user.id}
                >
                  <UserAvatar name={user.nickname} size="sm" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {user.nickname}
                  </span>
                  {addingUserId === user.id ? (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 11,
                        color: "var(--ink-3)",
                      }}
                    >
                      adding...
                    </span>
                  ) : (
                    <span
                      style={{
                        marginLeft: "auto",
                        color: "var(--primary)",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      + add
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        className="leave-btn"
        onClick={handleLeaveGroup}
        disabled={leaving}
        style={{ marginTop: 16 }}
      >
        {leaving ? "Leaving..." : "Leave group"}
      </button>
    </div>
  );
}
