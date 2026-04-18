"use client";

import { useState, useEffect } from "react";
import { Icons } from "./Icons";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("blip-theme") as "light" | "dark" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  function toggle(mode: "light" | "dark") {
    setTheme(mode);
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem("blip-theme", mode);
  }

  return (
    <div className="theme-toggle">
      <button
        className={theme === "light" ? "active" : ""}
        onClick={() => toggle("light")}
      >
        <Icons.Sun />
      </button>
      <button
        className={theme === "dark" ? "active" : ""}
        onClick={() => toggle("dark")}
      >
        <Icons.Moon />
      </button>
    </div>
  );
}
