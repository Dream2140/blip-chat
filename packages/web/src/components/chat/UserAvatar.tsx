"use client";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  size?: "sm" | "md" | "lg";
  color?: string;
}

const colors = [
  "#FF6B9D", "#FFD93D", "#6BCB77", "#8B5CF6",
  "#FF8C42", "#4ECDC4", "#A78BFA", "#F472B6",
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function UserAvatar({ name, isOnline, size = "md", color }: UserAvatarProps) {
  const initial = name[0]?.toUpperCase() || "?";
  const sizeClass = size === "sm" ? " sm" : size === "lg" ? " lg" : "";
  const bgColor = color || getColor(name);

  return (
    <div className={`avatar${sizeClass}`} style={{ background: bgColor }}>
      <span>{initial}</span>
      {isOnline !== undefined && (
        <span className={`presence-dot ${isOnline ? "online" : "offline"}`} />
      )}
    </div>
  );
}
