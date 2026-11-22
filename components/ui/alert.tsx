import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconAlertCircle, IconAlertTriangle, IconCheckCircle, IconInfo } from "./icons";

export type AlertTone = "error" | "success" | "warning" | "info";

const TONES: Record<AlertTone, { box: string; icon: typeof IconInfo }> = {
  error: { box: "border-bad-line bg-bad-bg text-bad-fg", icon: IconAlertCircle },
  success: { box: "border-ok-line bg-ok-bg text-ok-fg", icon: IconCheckCircle },
  warning: { box: "border-warn-line bg-warn-bg text-warn-fg", icon: IconAlertTriangle },
  info: { box: "border-info-line bg-info-bg text-info-fg", icon: IconInfo },
};

interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Acción opcional (por ejemplo, un botón de reintento) alineada a la derecha. */
  action?: ReactNode;
}

/**
 * Mensaje de estado. Los errores y avisos usan role="alert" (se anuncian de inmediato);
 * éxito e información usan role="status" (cortés).
 */
export function Alert({ tone = "info", title, children, className, action }: AlertProps) {
  const { box, icon: Icon } = TONES[tone];
  const urgent = tone === "error" || tone === "warning";

  return (
    <div
      role={urgent ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm", box, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(Boolean(title) && "mt-0.5 opacity-90")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
