"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useConversationStore } from "@/stores/conversation-store";
import { apiFetch } from "@/lib/api-client";
import { formatMessage } from "@/lib/message-format";
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
  const [showReaders, setShowReaders] = useState(false);
  const [readers, setReaders] = useState<
    { id: string; nickname: string; avatarUrl: string | null }[]
  >([]);
  const [loadingReaders, setLoadingReaders] = useState(false);

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const readersRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const bubbleRef = useRef<HTMLDivElement>(null);

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

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeContextMenu();
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", closeContextMenu, true);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", closeContextMenu, true);
    };
  }, [showContextMenu, closeContextMenu]);

  // Close readers popup on outside click
  useEffect(() => {
    if (!showReaders) return;

    function handleClick(e: MouseEvent) {
      if (
        readersRef.current &&
        !readersRef.current.contains(e.target as Node)
      ) {
        setShowReaders(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [showReaders]);

  async function handleReadTicksClick() {
    if (showReaders) {
      setShowReaders(false);
      return;
    }
    setLoadingReaders(true);
    setShowReaders(true);
    try {
      const res = await apiFetch(`/api/messages/${message.id}/readers`);
      if (res.ok) {
        const data = await res.json();
        setReaders(data.readers);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingReaders(false);
    }
  }

  // Auto-focus and auto-resize edit textarea
  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
      const el = editTextareaRef.current;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }, [isEditing]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }

  function handleTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientX - touchStartX.current;
    if (delta > 0 && delta < 80) {
      touchDeltaX.current = delta;
      if (bubbleRef.current) {
        bubbleRef.current.style.transform = `translateX(${delta * 0.4}px)`;
        bubbleRef.current.style.opacity = String(1 - delta / 200);
      }
    }
  }

  function handleTouchEnd() {
    if (touchDeltaX.current > 60 && onReply) {
      onReply(message);
    }
    if (bubbleRef.current) {
      bubbleRef.current.style.transform = "";
      bubbleRef.current.style.opacity = "";
    }
    touchDeltaX.current = 0;
  }

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

  async function toggleStar() {
    try {
      const res = await apiFetch(`/api/messages/${message.id}/star`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        toast.show(data.starred ? "Message starred" : "Message unstarred", "success");
      }
    } catch {
      toast.show("Failed to star message", "error");
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
          <div
            className="bubble-wrap"
            ref={bubbleRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
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
            <div className={`bubble ${stackClass}`} title={new Date(message.createdAt).toLocaleString()}>
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
                message.text ? formatMessage(message.text) : null
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

          <div className="meta" style={{ position: "relative" }}>
            <span>{time}</span>
            {message.editedAt && (
              <span className="edited-label">(edited)</span>
            )}
            {isOwn && message.status === "read" ? (
              <span
                className="read-ticks"
                style={{ cursor: "pointer" }}
                onClick={handleReadTicksClick}
              >
                {readText}
              </span>
            ) : isOwn ? (
              <span className="read-ticks">{readText}</span>
            ) : null}
            {showReaders && (
              <div className="readers-popup" ref={readersRef}>
                {loadingReaders ? (
                  <div className="reader-item" style={{ color: "var(--ink-3)" }}>
                    loading...
                  </div>
                ) : readers.length === 0 ? (
                  <div className="reader-item" style={{ color: "var(--ink-3)" }}>
                    no readers yet
                  </div>
                ) : (
                  readers.map((r) => (
                    <div key={r.id} className="reader-item">
                      <UserAvatar name={r.nickname} size="sm" />
                      <span>{r.nickname}</span>
                    </div>
                  ))
                )}
              </div>
            )}
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
          <button
            onClick={() => {
              toggleStar();
              closeContextMenu();
            }}
          >
            <span>{"\u2B50"}</span> Star
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
