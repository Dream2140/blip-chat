"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useConversationStore } from "@/stores/conversation-store";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "./Toast";
import { UserAvatar } from "./UserAvatar";
import { ForwardModal } from "./ForwardModal";
import type { Message, MessageReaction } from "@chat-app/shared";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  stackClass: string;
  onReply?: (message: Message) => void;
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  stackClass,
  onReply,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const toast = useToast();

  // Close context menu on outside click or scroll
  const closeContextMenu = useCallback(() => {
    setShowContextMenu(false);
  }, []);

  useEffect(() => {
    if (!showContextMenu) return;

    function handleClick(e: MouseEvent) {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        closeContextMenu();
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("scroll", closeContextMenu, true);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("scroll", closeContextMenu, true);
    };
  }, [showContextMenu, closeContextMenu]);

  // Auto-focus and auto-resize edit textarea
  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
      const el = editTextareaRef.current;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }, [isEditing]);

  if (message.deletedAt) {
    return (
      <div className={`msg-row ${isOwn ? "me" : ""}`}>
        <div className="msg-group">
          <div className="bubble" style={{ fontStyle: "italic", opacity: 0.5 }}>
            message deleted
          </div>
        </div>
      </div>
    );
  }

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const readText =
    message.status === "read"
      ? "✓✓ read"
      : message.status === "delivered"
        ? "✓✓"
        : "✓ sent";

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }

  function startEdit() {
    setEditText(message.text || "");
    setIsEditing(true);
    setShowContextMenu(false);
  }

  async function saveEdit() {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === message.text) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/api/messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        useConversationStore.getState().updateMessage(
          message.conversationId,
          message.id,
          {
            text: data.message.text,
            editedAt: data.message.editedAt,
          }
        );
        setIsEditing(false);
      } else {
        const err = await res.json().catch(() => null);
        toast.show(err?.error || "Failed to edit message", "error");
      }
    } catch {
      toast.show("Network error — edit failed", "error");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditText("");
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === "Escape") {
      cancelEdit();
    }
  }

  function startDelete() {
    setShowDeleteConfirm(true);
    setShowContextMenu(false);
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/messages/${message.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        useConversationStore
          .getState()
          .removeMessage(message.conversationId, message.id);
        toast.show("Message deleted", "success");
      } else {
        const err = await res.json().catch(() => null);
        toast.show(err?.error || "Failed to delete message", "error");
      }
    } catch {
      toast.show("Network error — delete failed", "error");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function togglePin() {
    const res = await apiFetch(`/api/messages/${message.id}/pin`, {
      method: "POST",
    });

    if (res.ok) {
      const data = await res.json();
      useConversationStore.getState().updateMessage(
        message.conversationId,
        message.id,
        { pinnedAt: data.pinnedAt }
      );
      toast.show(
        data.pinnedAt ? "Message pinned" : "Message unpinned",
        "success"
      );
    }
  }

  async function toggleReaction(emoji: string) {
    const res = await apiFetch(`/api/messages/${message.id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });

    if (res.ok) {
      const data = await res.json();
      useConversationStore.getState().updateMessage(
        message.conversationId,
        message.id,
        { reactions: data.reactions }
      );
    }
  }

  const reactions = message.reactions || [];

  return (
    <>
      <div
        className={`msg-row ${isOwn ? "me" : ""} ${showAvatar ? "show-avatar" : ""}`}
        onContextMenu={handleContextMenu}
      >
        {!isOwn && (
          <UserAvatar name={message.sender?.nickname || "?"} size="sm" />
        )}
        <div className="msg-group">
          <div className="bubble-wrap">
            {message.replyTo && (
              <div className="reply-quote">
                <div className="rq-name">
                  ↪ {message.replyTo.sender?.nickname || "you"}
                </div>
                <div>
                  {message.replyTo.text?.slice(0, 60)}
                  {(message.replyTo.text?.length || 0) > 60 ? "…" : ""}
                </div>
              </div>
            )}
            <div className={`bubble ${stackClass}`}>
              {isEditing ? (
                <div>
                  <textarea
                    ref={editTextareaRef}
                    className="inline-edit-area"
                    value={editText}
                    onChange={(e) => {
                      setEditText(e.target.value);
                      const el = e.target;
                      el.style.height = "auto";
                      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
                    }}
                    onKeyDown={handleEditKeyDown}
                    rows={1}
                  />
                  <div className="inline-edit-actions">
                    <button
                      className="save-btn"
                      onClick={saveEdit}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button className="cancel-btn" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                message.text
              )}
              {!isEditing && (
                <div className="hover-actions">
                  <button onClick={() => toggleReaction("❤️")} title="heart">
                    ❤️
                  </button>
                  <button onClick={() => toggleReaction("😂")} title="laugh">
                    😂
                  </button>
                  <button onClick={() => toggleReaction("🔥")} title="fire">
                    🔥
                  </button>
                  <button onClick={togglePin} title="pin">
                    {"\uD83D\uDCCC"}
                  </button>
                  {onReply && (
                    <button onClick={() => onReply(message)} title="reply">
                      ↩
                    </button>
                  )}
                  {isOwn && (
                    <>
                      <button onClick={startEdit} title="edit">
                        ✏️
                      </button>
                      <button onClick={startDelete} title="delete">
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {reactions.length > 0 && (
            <div className="reactions">
              {reactions.map((r: MessageReaction) => (
                <button
                  key={r.emoji}
                  className={`reaction-chip ${r.byMe ? "by-me" : ""}`}
                  onClick={() => toggleReaction(r.emoji)}
                >
                  <span>{r.emoji}</span>
                  {r.count > 1 && <span className="count">{r.count}</span>}
                </button>
              ))}
            </div>
          )}

          {showDeleteConfirm && (
            <div className="delete-confirm">
              <span>Delete this message?</span>
              <button
                className="yes-btn"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "..." : "Yes"}
              </button>
              <button
                className="no-btn"
                onClick={() => setShowDeleteConfirm(false)}
              >
                No
              </button>
            </div>
          )}

          <div className="meta">
            <span>{time}</span>
            {message.editedAt && (
              <span className="edited-label">(edited)</span>
            )}
            {isOwn && <span className="read-ticks">{readText}</span>}
          </div>
        </div>
      </div>

      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
        >
          {onReply && (
            <button
              onClick={() => {
                onReply(message);
                closeContextMenu();
              }}
            >
              <span>↩</span> Reply
            </button>
          )}
          {isOwn ? (
            <>
              <button onClick={startEdit}>
                <span>✏️</span> Edit
              </button>
              <button className="danger" onClick={startDelete}>
                <span>🗑️</span> Delete
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                toggleReaction("❤️");
                closeContextMenu();
              }}
            >
              <span>❤️</span> React
            </button>
          )}
          <button
            onClick={() => {
              setForwardMessage(message);
              closeContextMenu();
            }}
          >
            <span>{"\u21AA"}</span> Forward
          </button>
          <button
            onClick={() => {
              togglePin();
              closeContextMenu();
            }}
          >
            <span>{"\uD83D\uDCCC"}</span> {message.pinnedAt ? "Unpin" : "Pin"}
          </button>
        </div>
      )}

      {forwardMessage && (
        <ForwardModal
          message={forwardMessage}
          onClose={() => setForwardMessage(null)}
        />
      )}
    </>
  );
}
