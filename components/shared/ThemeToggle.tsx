"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  storageKey?: string;
}

export default function ThemeToggle({ storageKey = "claude-intel-theme" }: ThemeToggleProps) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    const initial = stored ? (stored as "light" | "dark") : "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, [storageKey]);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(storageKey, next);
  };

  return (
    <button
      onClick={toggle}
      className="fixed top-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-200 hover:scale-105"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border)",
        color: "var(--text-primary)",
      }}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
