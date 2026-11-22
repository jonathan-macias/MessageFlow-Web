/** Une clases ignorando valores falsos. Sin dependencias: los componentes controlan sus variantes. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
