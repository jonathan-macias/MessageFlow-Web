import { cn } from "@/lib/cn";

/**
 * Marca de MessageFlow: una burbuja de mensaje que contiene un pequeño flujo
 * (dos nodos conectados). Se dibuja en SVG y hereda el color del acento.
 */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-lg bg-accent text-on-accent", className)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-[62%]">
        <path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-7L8 20v-3.5H5A1.5 1.5 0 0 1 3.5 15V6A1.5 1.5 0 0 1 5 4.5Z" />
        <circle cx="8.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
        <path d="M9.6 10.5h4.8" />
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold tracking-tight", className)}>
      Message<span className="text-accent">Flow</span>
    </span>
  );
}

/** Marca completa (logomark + wordmark). */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <Wordmark className="text-sm" />
    </span>
  );
}
