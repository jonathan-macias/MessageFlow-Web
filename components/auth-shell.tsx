import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/ui/logo";

/**
 * Fondo sutil para las pantallas de acceso: rejilla de puntos difuminada, un halo del acento y
 * dos pequeños flujos de nodos conectados (la idea del producto). Es decorativo y no recibe foco.
 */
function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: "radial-gradient(var(--line-strong) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(ellipse 60% 55% at 50% 40%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 40%, black, transparent 75%)",
        }}
      />
      <div
        className="absolute left-1/2 top-0 h-72 w-[36rem] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-70 blur-3xl"
        style={{ background: "var(--accent-soft)" }}
      />
      <svg
        className="absolute left-[6%] top-[22%] hidden h-40 w-56 text-accent opacity-40 md:block"
        viewBox="0 0 224 160"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
      >
        <path d="M24 28c60 6 70 52 112 56M24 132c60-6 70-30 112-48" strokeDasharray="3 5" />
        <circle cx="24" cy="28" r="5" fill="var(--canvas)" />
        <circle cx="24" cy="132" r="5" fill="var(--canvas)" />
        <circle cx="136" cy="84" r="7" fill="var(--canvas)" />
        <circle cx="136" cy="84" r="2.5" fill="currentColor" stroke="none" />
      </svg>
      <svg
        className="absolute bottom-[14%] right-[6%] hidden h-36 w-52 text-accent opacity-30 md:block"
        viewBox="0 0 208 144"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
      >
        <path d="M184 24c-56 6-66 44-104 48M184 120c-56-6-66-26-104-48" strokeDasharray="3 5" />
        <circle cx="184" cy="24" r="5" fill="var(--canvas)" />
        <circle cx="184" cy="120" r="5" fill="var(--canvas)" />
        <circle cx="80" cy="72" r="7" fill="var(--canvas)" />
        <circle cx="80" cy="72" r="2.5" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Contenido bajo la tarjeta (enlace a la otra pantalla de acceso). */
  footer?: ReactNode;
}

/** Estructura común de Sign in / Create account: mismas proporciones que antes (max-w-sm, centrado). */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="relative flex flex-1 items-center justify-center px-4 py-10">
      <Backdrop />
      <div className="relative w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <LogoMark className="size-11 rounded-xl" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>
        </div>

        <Card className="space-y-4 p-5 shadow-pop">{children}</Card>

        {footer && <p className="text-center text-sm text-muted">{footer}</p>}
      </div>
    </main>
  );
}
