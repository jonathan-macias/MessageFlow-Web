"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { IconMoon, IconSun } from "./icons";

export type Theme = "dark" | "light";

const STORAGE_KEY = "theme";

function subscribe(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Cambia el tema y lo recuerda. El script de app/layout.tsx lo aplica antes de pintar. */
export function setTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Almacenamiento no disponible (modo privado): el cambio sigue valiendo para esta sesión.
  }
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "dark");
}

/** Botón (ghost) o fila de menú para alternar entre tema oscuro y claro. */
export function ThemeToggle({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  const theme = useTheme();
  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = `Switch to ${next} theme`;

  return (
    <button
      type="button"
      role={withLabel ? "menuitem" : undefined}
      onClick={() => setTheme(next)}
      aria-label={withLabel ? undefined : label}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg",
        withLabel ? "w-full px-3 py-2 text-sm" : "p-1.5",
        className,
      )}
    >
      {theme === "dark" ? <IconSun className="size-4" /> : <IconMoon className="size-4" />}
      {withLabel && <span>{theme === "dark" ? "Light theme" : "Dark theme"}</span>}
    </button>
  );
}
