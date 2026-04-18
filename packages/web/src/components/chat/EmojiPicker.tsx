"use client";

import { useState } from "react";

const CATEGORIES: Record<string, { label: string; emojis: string[] }> = {
  recent: {
    label: "Recent",
    emojis: ["😂", "😭", "🔥", "💯", "🥹", "✨", "🤌", "😍"],
  },
  smileys: {
    label: "Smileys",
    emojis: [
      "😂", "😭", "🥹", "😍", "🙃", "💀", "😤", "🫠",
      "😮‍💨", "🥲", "🙏", "😎", "🤔", "😴",
    ],
  },
  animals: {
    label: "Animals",
    emojis: ["🐶", "🐱", "🐭", "🐹", "🦊", "🐻", "🐼", "🐸", "🦋", "🐝"],
  },
  food: {
    label: "Food",
    emojis: ["☕", "🍵", "🍕", "🍔", "🌮", "🍣", "🍰", "🍪", "🥑", "🍄"],
  },
  objects: {
    label: "Objects",
    emojis: ["🎧", "🎵", "🌙", "⭐", "🪩", "💛", "🤘", "🌿", "🌸", "🎉"],
  },
};

const CATEGORY_KEYS = Object.keys(CATEGORIES);

const CATEGORY_ICONS: Record<string, string> = {
  recent: "🕐",
  smileys: "😊",
  animals: "🐾",
  food: "🍕",
  objects: "🎧",
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState("recent");

  const category = CATEGORIES[activeCategory];

  return (
    <div className="emoji-picker">
      <div className="emoji-tabs">
        {CATEGORY_KEYS.map((key) => (
          <button
            key={key}
            className={`emoji-tab${key === activeCategory ? " active" : ""}`}
            onClick={() => setActiveCategory(key)}
            title={CATEGORIES[key].label}
          >
            {CATEGORY_ICONS[key]}
          </button>
        ))}
      </div>

      <div className="emoji-grid">
        {category.emojis.map((emoji, i) => (
          <button
            key={`${activeCategory}-${i}`}
            className="emoji-cell"
            onClick={() => onSelect(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
