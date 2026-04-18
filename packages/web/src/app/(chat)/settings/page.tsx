"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/chat/Toast";
import { Icons } from "@/components/chat/Icons";

/* ── accent colour palette ── */
const ACCENT_COLORS = [
  { name: "violet", hex: "#6D28D9", soft: "#EDE4FF", gradient: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)" },
  { name: "pink", hex: "#EC4899", soft: "#FDE4F0", gradient: "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)" },
  { name: "emerald", hex: "#059669", soft: "#D1FAE5", gradient: "linear-gradient(135deg, #059669 0%, #34D399 100%)" },
  { name: "tangerine", hex: "#EA580C", soft: "#FFEDD5", gradient: "linear-gradient(135deg, #EA580C 0%, #FB923C 100%)" },
  { name: "sky", hex: "#0284C7", soft: "#DBEAFE", gradient: "linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)" },
] as const;

/* ── bubble style presets ── */
const BUBBLE_STYLES = [
  { name: "asymmetric", radius: "22px" },
  { name: "rounded", radius: "18px" },
  { name: "squared", radius: "8px" },
] as const;

/* ── tiny SVG icons for settings rows ── */
const SettingsIcons = {
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Palette: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="8" r="1.5" fill="currentColor" /><circle cx="8" cy="12" r="1.5" fill="currentColor" /><circle cx="16" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  Bubble: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Back: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
};

/* ── toggle switch ── */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 44,
        height: 26,
        borderRadius: 999,
        background: on ? "var(--primary)" : "var(--line)",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

/* ── settings row ── */
function SettingsRow({
  icon,
  label,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        borderRadius: 14,
        cursor: onClick ? "pointer" : "default",
        transition: "background 0.15s",
        background: "transparent",
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.background = "var(--bg-sunk)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <span style={{ color: "var(--ink-3)", flexShrink: 0, display: "grid", placeItems: "center" }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  );
}

/* ── section heading ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "var(--ink-3)",
        padding: "20px 16px 8px",
      }}
    >
      {children}
    </div>
  );
}

/* ============================================================= */
export default function SettingsPage() {
  const router = useRouter();
  const currentUser = useChatStore((s) => s.currentUser);
  const setCurrentUser = useChatStore((s) => s.setCurrentUser);
  const toast = useToast((s) => s.show);

  /* ── appearance state ── */
  const [darkMode, setDarkMode] = useState(false);
  const [accent, setAccent] = useState("violet");
  const [bubbleStyle, setBubbleStyle] = useState("asymmetric");

  /* ── notification state ── */
  const [sounds, setSounds] = useState(true);
  const [preview, setPreview] = useState(true);

  /* ── profile editing ── */
  const [editingProfile, setEditingProfile] = useState(false);
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  /* ── load stored prefs on mount ── */
  useEffect(() => {
    setDarkMode(localStorage.getItem("blip-theme") === "dark");
    setAccent(localStorage.getItem("blip-accent") || "violet");
    setBubbleStyle(localStorage.getItem("blip-bubble") || "asymmetric");
    setSounds(localStorage.getItem("blip-sounds") !== "false");
    setPreview(localStorage.getItem("blip-preview") !== "false");
  }, []);

  /* ── sync profile fields when currentUser loads ── */
  useEffect(() => {
    if (currentUser) {
      setNickname(currentUser.nickname);
      setBio(currentUser.bio || "");
    }
  }, [currentUser]);

  /* ── dark mode toggle ── */
  const toggleDarkMode = useCallback(() => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("blip-theme", next ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  }, [darkMode]);

  /* ── accent colour ── */
  const pickAccent = useCallback((color: typeof ACCENT_COLORS[number]) => {
    setAccent(color.name);
    localStorage.setItem("blip-accent", color.name);
    document.documentElement.style.setProperty("--primary", color.hex);
    document.documentElement.style.setProperty("--primary-soft", color.soft);
    document.documentElement.style.setProperty("--bubble-me-bg", color.gradient);
  }, []);

  /* ── bubble style ── */
  const pickBubble = useCallback((style: typeof BUBBLE_STYLES[number]) => {
    setBubbleStyle(style.name);
    localStorage.setItem("blip-bubble", style.name);
    document.documentElement.style.setProperty("--radius-bubble", style.radius);
  }, []);

  /* ── notification toggles ── */
  const toggleSounds = useCallback(() => {
    setSounds((prev) => {
      localStorage.setItem("blip-sounds", String(!prev));
      return !prev;
    });
  }, []);

  const togglePreview = useCallback(() => {
    setPreview((prev) => {
      localStorage.setItem("blip-preview", String(!prev));
      return !prev;
    });
  }, []);

  /* ── save profile ── */
  const saveProfile = useCallback(async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim(), bio: bio.trim() || null }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) setCurrentUser(data.user);
        toast("Profile updated!", "success");
        setEditingProfile(false);
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to update profile", "error");
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }, [nickname, bio, toast, setCurrentUser]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "32px 24px 40px",
        maxWidth: 560,
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <button
          className="icon-btn"
          onClick={() => router.push("/")}
          title="Back"
        >
          <SettingsIcons.Back />
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>settings</h1>
      </div>

      {/* ── ACCOUNT ── */}
      <SectionLabel>account</SectionLabel>
      <div
        style={{
          background: "var(--bg-elev)",
          borderRadius: 18,
          boxShadow: "var(--shadow-card)",
          overflow: "hidden",
        }}
      >
        {!editingProfile ? (
          <SettingsRow
            icon={<SettingsIcons.User />}
            label={`@${currentUser?.nickname || "..."}`}
            onClick={() => setEditingProfile(true)}
          >
            <span style={{ color: "var(--ink-3)", fontSize: 12 }}>
              <SettingsIcons.Edit />
            </span>
          </SettingsRow>
        ) : (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                nickname
              </label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "10px 12px",
                  fontSize: 14,
                  background: "var(--bg-sunk)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  outline: "none",
                  color: "var(--ink)",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                bio
              </label>
              <input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="tell us about you..."
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "10px 12px",
                  fontSize: 14,
                  background: "var(--bg-sunk)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  outline: "none",
                  color: "var(--ink)",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setEditingProfile(false);
                  if (currentUser) {
                    setNickname(currentUser.nickname);
                    setBio(currentUser.bio || "");
                  }
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 10,
                  color: "var(--ink-2)",
                }}
              >
                cancel
              </button>
              <button
                onClick={saveProfile}
                disabled={saving || !nickname.trim()}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 10,
                  background: "var(--primary)",
                  color: "var(--primary-ink)",
                  opacity: saving || !nickname.trim() ? 0.5 : 1,
                }}
              >
                {saving ? "saving..." : "save"}
              </button>
            </div>
          </div>
        )}
        <SettingsRow icon={<SettingsIcons.Shield />} label="privacy">
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>everyone</span>
        </SettingsRow>
      </div>

      {/* ── APPEARANCE ── */}
      <SectionLabel>appearance</SectionLabel>
      <div
        style={{
          background: "var(--bg-elev)",
          borderRadius: 18,
          boxShadow: "var(--shadow-card)",
          overflow: "hidden",
        }}
      >
        {/* dark mode */}
        <SettingsRow icon={darkMode ? <Icons.Moon /> : <Icons.Sun />} label="dark mode">
          <Toggle on={darkMode} onToggle={toggleDarkMode} />
        </SettingsRow>

        {/* accent colour */}
        <SettingsRow icon={<SettingsIcons.Palette />} label="accent color">
          <div style={{ display: "flex", gap: 8 }}>
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.name}
                title={c.name}
                onClick={() => pickAccent(c)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: c.hex,
                  border: accent === c.name ? "2.5px solid var(--ink)" : "2.5px solid transparent",
                  transition: "border-color 0.15s, transform 0.15s",
                  transform: accent === c.name ? "scale(1.15)" : "scale(1)",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </SettingsRow>

        {/* bubble style */}
        <SettingsRow icon={<SettingsIcons.Bubble />} label="bubble style">
          <div style={{ display: "flex", gap: 6 }}>
            {BUBBLE_STYLES.map((s) => (
              <button
                key={s.name}
                onClick={() => pickBubble(s)}
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 8,
                  background: bubbleStyle === s.name ? "var(--primary-soft)" : "var(--bg-sunk)",
                  color: bubbleStyle === s.name ? "var(--primary)" : "var(--ink-3)",
                  transition: "all 0.15s",
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </SettingsRow>
      </div>

      {/* ── NOTIFICATIONS ── */}
      <SectionLabel>notifications</SectionLabel>
      <div
        style={{
          background: "var(--bg-elev)",
          borderRadius: 18,
          boxShadow: "var(--shadow-card)",
          overflow: "hidden",
        }}
      >
        <SettingsRow icon={<SettingsIcons.Bell />} label="sounds">
          <Toggle on={sounds} onToggle={toggleSounds} />
        </SettingsRow>
        <SettingsRow icon={<SettingsIcons.Bell />} label="message preview">
          <Toggle on={preview} onToggle={togglePreview} />
        </SettingsRow>
      </div>
    </div>
  );
}
