import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const CONTROL =
  "w-full rounded-lg border border-line bg-field px-3 py-2 text-sm text-fg placeholder:text-subtle transition-colors " +
  "hover:border-line-strong focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 " +
  "disabled:opacity-60 disabled:cursor-not-allowed aria-[invalid=true]:border-bad-fg";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(CONTROL, "pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, className)} {...rest} />;
}

interface FieldProps {
  label: ReactNode;
  /** Texto de ayuda bajo el control. */
  hint?: ReactNode;
  /** Mensaje de error; marca el control como inválido. */
  error?: ReactNode;
  /** Tamaño de la etiqueta: "md" (formularios independientes) o "sm" (dentro de tarjetas). */
  labelSize?: "md" | "sm";
  className?: string;
  /** Un único control (Input, Select, Textarea...) que recibe id, aria-describedby y aria-invalid. */
  children: ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
}

/**
 * Asocia la etiqueta con su control (htmlFor/id) y enlaza la ayuda y el error con
 * aria-describedby, de modo que lectores de pantalla y pruebas por etiqueta funcionen.
 */
export function Field({ label, hint, error, labelSize = "md", className, children }: FieldProps) {
  const generatedId = useId();
  const child = Children.only(children);
  const id = (isValidElement(child) && child.props.id) || generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [child.props["aria-describedby"], hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={cn(
          "block mb-1",
          labelSize === "md" ? "text-sm font-medium text-fg" : "text-xs font-medium text-muted",
        )}
      >
        {label}
      </label>
      {cloneElement(child, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : child.props["aria-invalid"],
      })}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-xs text-bad-fg">
          {error}
        </p>
      )}
    </div>
  );
}
