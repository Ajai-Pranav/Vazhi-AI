"use client";

import { useTheme } from "@/lib/theme";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className={`theme-toggle ${className}`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      aria-label="Toggle theme"
    >
      <span className="toggle-icon">
        {theme === "dark" ? "☀️" : "🌙"}
      </span>
      <span style={{ fontSize: 12 }}>
        {theme === "dark" ? "Light" : "Dark"}
      </span>
    </button>
  );
}
