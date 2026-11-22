import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ExecutionStatus, FlowStatus } from "@/lib/types/flow";

export type BadgeTone = "neutral" | "accent" | "ok" | "warn" | "bad" | "info";

const TONES: Record<BadgeTone, { box: string; dot: string }> = {
  neutral: { box: "border-line bg-raised text-muted", dot: "bg-subtle" },
  accent: { box: "border-transparent bg-accent-soft text-accent", dot: "bg-accent" },
  ok: { box: "border-ok-line bg-ok-bg text-ok-fg", dot: "bg-ok-fg" },
  warn: { box: "border-warn-line bg-warn-bg text-warn-fg", dot: "bg-warn-fg" },
  bad: { box: "border-bad-line bg-bad-bg text-bad-fg", dot: "bg-bad-fg" },
  info: { box: "border-info-line bg-info-bg text-info-fg", dot: "bg-info-fg" },
};

export function Badge({
  tone = "neutral",
  dot = true,
  className,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const { box, dot: dotClass } = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        box,
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dotClass)} aria-hidden="true" />}
      {children}
    </span>
  );
}

const FLOW_TONES: Record<string, BadgeTone> = {
  Draft: "neutral",
  Active: "ok",
  Paused: "warn",
  Completed: "info",
  Archived: "neutral",
};

const EXECUTION_TONES: Record<string, BadgeTone> = {
  Pending: "neutral",
  Running: "info",
  Completed: "ok",
  PartiallyCompleted: "warn",
  Failed: "bad",
  Cancelled: "neutral",
};

/** Estado de un flow. Único origen del color por estado (antes había copias en cada página). */
export function FlowStatusBadge({ status }: { status: number }) {
  const label = FlowStatus[status] ?? "Unknown";
  return <Badge tone={FLOW_TONES[label] ?? "neutral"}>{label}</Badge>;
}

/** Estado de una ejecución de flow. */
export function ExecutionStatusBadge({ status }: { status: number }) {
  const label = ExecutionStatus[status] ?? "Unknown";
  return <Badge tone={EXECUTION_TONES[label] ?? "neutral"}>{label}</Badge>;
}
