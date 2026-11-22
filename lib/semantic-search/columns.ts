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
      return "Text";
    case ColumnDataType.Number:
      return "Number";
    case ColumnDataType.Date:
      return "Date";
    case ColumnDataType.Boolean:
      return "Boolean";
    default:
      return "Unknown";
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
  equals: "is equal to",
  not_equals: "is not equal to",
  contains: "contains",
  greater_than: "is greater than",
  greater_than_or_equal: "is greater than or equal to",
  less_than: "is less than",
  less_than_or_equal: "is less than or equal to",
  is_null: "is empty",
  is_not_null: "is not empty",
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

/** Tono del <Badge> de relevancia: alta = ok, media = warn, baja = neutral. */
export function similarityTone(similarity: number): "ok" | "warn" | "neutral" {
  if (similarity >= 0.85) return "ok";
  if (similarity >= 0.6) return "warn";
  return "neutral";
}

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

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
      if (normalized === "true") return "Yes";
      if (normalized === "false") return "No";
      return value;
    }
    default:
      return value;
  }
}
