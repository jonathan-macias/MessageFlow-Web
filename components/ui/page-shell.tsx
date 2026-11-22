import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Anchos de página existentes (se conservan tal cual, solo centralizados). */
const WIDTHS = {
  lg: "max-w-lg",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
} as const;

export type PageWidth = keyof typeof WIDTHS;

interface PageShellProps {
  width?: PageWidth;
  /** Sustituye el espaciado por defecto ("py-10 space-y-6"). */
  className?: string;
  /** La página ocupa todo el alto disponible (chat, paneles con scroll interno). */
  fill?: boolean;
  children: ReactNode;
}

/**
 * Contenedor común de las páginas: landmark <main>, ancho máximo y espaciado.
 * El fondo viene del <body> (tokens), ya no se repite en cada página.
 */
export function PageShell({ width = "4xl", className, fill = false, children }: PageShellProps) {
  return (
    <main className="flex flex-1 min-h-0">
      <div
        className={cn(
          "mx-auto w-full px-4",
          WIDTHS[width],
          className ?? "py-10 space-y-6",
          fill && "flex min-h-0 flex-col",
        )}
      >
        {children}
      </div>
    </main>
  );
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Acciones principales de la página (botones o enlaces), alineadas a la derecha. */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
