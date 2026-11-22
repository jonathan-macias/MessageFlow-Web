import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Añade realce al pasar el ratón (tarjetas que son enlaces o filas seleccionables). */
  interactive?: boolean;
}

export function Card({ className, interactive = false, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-surface p-4",
        interactive && "transition-colors hover:border-line-strong hover:bg-raised",
        className,
      )}
      {...rest}
    />
  );
}

/** Encabezado de sección dentro de un formulario o panel. */
export function SectionTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-xs font-semibold uppercase tracking-wider text-subtle", className)} {...rest} />;
}

export function StatCard({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("p-3", className)}>
      <p className="text-xs text-subtle">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-fg">{value}</p>
    </Card>
  );
}
