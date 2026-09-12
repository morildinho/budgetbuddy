"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

const STORAGE_KEY = "budgetbuddy.theme";

function updateBrowserThemeColor(theme: Theme) {
  document.querySelectorAll('meta[name="theme-color"]').forEach((themeMeta) => {
    themeMeta.setAttribute("content", theme === "dark" ? "#09111f" : "#17624e");
  });
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("budgetbuddy-theme-change", onStoreChange);
      return () => window.removeEventListener("budgetbuddy-theme-change", onStoreChange);
    },
    () => document.documentElement.dataset.theme === "dark" ? "dark" : "light",
    () => "light"
  ) as Theme;

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    updateBrowserThemeColor(nextTheme);
    window.dispatchEvent(new Event("budgetbuddy-theme-change"));
  };

  const isDark = theme === "dark";
  const label = isDark ? "Bytt til Nordic Calm" : "Bytt til Midnight";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-secondary)] shadow-sm transition-colors hover:border-[var(--border-secondary)] hover:text-[var(--text-primary)]",
        compact ? "h-10 w-10" : "h-10 w-full px-3 text-sm"
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!compact && <span>{isDark ? "Nordic Calm" : "Midnight"}</span>}
    </button>
  );
}
