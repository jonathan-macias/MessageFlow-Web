import type { SemanticOperator } from "@/lib/types/ai";
import type { DatasetColumn } from "@/lib/types/dataset";

/**
 * `dataType` llega como número desde el backend. Si algún día el backend lo serializa
 * como string, este es el único punto que hay que tocar.
 */
export const ColumnDataType = {
  Text: 1,
  Number: 2,
  Date: 3,
  Boolean: 4,
} as const;

export type ColumnDataTypeValue = (typeof ColumnDataType)[keyof typeof ColumnDataType];

export function dataTypeLabel(dataType: number): string {
  switch (dataType) {
    case ColumnDataType.Text:
      return "Texto";
    case ColumnDataType.Number:
      return "Número";
    case ColumnDataType.Date:
      return "Fecha";
    case ColumnDataType.Boolean:
      return "Booleano";
    default:
      return "Desconocido";
  }
}

export function isTextColumn(column: DatasetColumn): boolean {
  return column.dataType === ColumnDataType.Text;
}

export function hasTextColumns(columns: DatasetColumn[]): boolean {
  return columns.some(isTextColumn);
}

const TEXT_OPERATORS: SemanticOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "is_null",
  "is_not_null",
];

const COMPARABLE_OPERATORS: SemanticOperator[] = [
  "equals",
  "not_equals",
  "greater_than",
  "greater_than_or_equal",
  "less_than",
  "less_than_or_equal",
  "is_null",
  "is_not_null",
];

export function operatorsForDataType(dataType: number): SemanticOperator[] {
  switch (dataType) {
    case ColumnDataType.Text:
      return TEXT_OPERATORS;
    case ColumnDataType.Number:
    case ColumnDataType.Date:
      return COMPARABLE_OPERATORS;
    case ColumnDataType.Boolean:
      return ["equals", "is_null", "is_not_null"];
    default:
      return ["equals", "not_equals", "is_null", "is_not_null"];
  }
}

const OPERATOR_LABELS: Record<SemanticOperator, string> = {
  equals: "es igual a",
  not_equals: "no es igual a",
  contains: "contiene",
  greater_than: "es mayor que",
  greater_than_or_equal: "es mayor o igual que",
  less_than: "es menor que",
  less_than_or_equal: "es menor o igual que",
  is_null: "está vacío",
  is_not_null: "no está vacío",
};

export function operatorLabel(operator: SemanticOperator): string {
  return OPERATOR_LABELS[operator];
}

export function operatorNeedsValue(operator: SemanticOperator): boolean {
  return operator !== "is_null" && operator !== "is_not_null";
}

export function formatOperatorForCopy(operator: string): string {
  const known = OPERATOR_LABELS[operator as SemanticOperator];
  return known ?? operator;
}

export function formatSimilarity(similarity: number): string {
  if (!Number.isFinite(similarity)) return "0%";
  const percent = Math.round(Math.max(0, Math.min(1, similarity)) * 100);
  return `${percent}%`;
}

export function similarityTone(similarity: number): string {
  if (similarity >= 0.85) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  if (similarity >= 0.6) return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

export function formatCellValue(value: string | null, dataType: number | undefined): string {
  if (value === null || value === undefined || value === "") return "—";

  switch (dataType) {
    case ColumnDataType.Number: {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? numberFormatter.format(parsed) : value;
    }
    case ColumnDataType.Date: {
      const timestamp = Date.parse(value);
      return Number.isNaN(timestamp) ? value : dateFormatter.format(new Date(timestamp));
    }
    case ColumnDataType.Boolean: {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") return "Sí";
      if (normalized === "false") return "No";
      return value;
    }
    default:
      return value;
  }
}
