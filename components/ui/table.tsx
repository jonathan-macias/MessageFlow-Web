import type { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Tabla con el estilo de la app. El contenedor hace scroll horizontal en pantallas estrechas
 * (las tablas de datasets pueden tener muchas columnas) sin desbordar la página.
 */
export function Table({ className, children, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className={cn("w-full border-collapse text-sm", className)} {...rest}>
        {children}
      </table>
    </div>
  );
}

export function THead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-raised text-left text-xs text-muted", className)} {...rest} />;
}

export function Th({ className, scope = "col", ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope={scope} className={cn("px-3 py-2 font-medium whitespace-nowrap", className)} {...rest} />;
}

export function Tr({
  className,
  interactive = false,
  selected = false,
  ...rest
}: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean; selected?: boolean }) {
  return (
    <tr
      className={cn(
        "border-t border-line",
        interactive && "cursor-pointer transition-colors hover:bg-raised",
        selected && "bg-raised",
        className,
      )}
      {...rest}
    />
  );
}

export function Td({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-2 text-fg", className)} {...rest} />;
}
