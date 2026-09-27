import type { SemanticSearchFilter, SemanticSearchRequest } from "@/lib/types/ai";
import type { DatasetColumn } from "@/lib/types/dataset";
import { dataTypeLabel, operatorNeedsValue, operatorsForDataType } from "@/lib/semantic-search/columns";

export const MAX_FILTERS = 5;
export const MAX_QUESTION_LENGTH = 1000;
export const DEFAULT_TOP_K = 10;
export const MIN_TOP_K = 1;
export const MAX_TOP_K = 50;

export interface FilterDraft {
  id: string;
  column: string;
  operator: DraftOperator;
  value: string;
}

export type SemanticOperatorValue = SemanticSearchFilter["operator"];
export type DraftOperator = SemanticOperatorValue | "";

export function newFilterDraft(): FilterDraft {
  return { id: crypto.randomUUID(), column: "", operator: "", value: "" };
}

export function findColumn(columns: DatasetColumn[], name: string): DatasetColumn | undefined {
  return columns.find((column) => column.name === name);
}

/**
 * Al cambiar de columna los operadores válidos cambian según su tipo, así que se
 * reinicia el operador para no dejar uno incompatible seleccionado.
 */
export function defaultOperatorForColumn(column: DatasetColumn | undefined): DraftOperator {
  if (!column) return "";
  return operatorsForDataType(column.dataType)[0] ?? "";
}

function draftError(draft: FilterDraft, column: DatasetColumn | undefined): string | null {
  if (!draft.column) return "Elige una columna.";
  if (!column) return "La columna elegida no existe en este dataset.";
  if (!draft.operator) return "Elige un operador.";
  if (!operatorsForDataType(column.dataType).includes(draft.operator)) {
    return `Ese operador no es válido para columnas de tipo ${dataTypeLabel(column.dataType).toLowerCase()}.`;
  }
  if (operatorNeedsValue(draft.operator) && !draft.value.trim()) {
    return "Escribe un valor para este operador.";
  }
  return null;
}

export interface FilterValidation {
  errors: Record<string, string>;
  filters: SemanticSearchFilter[];
}

export function buildFilters(
  drafts: FilterDraft[],
  columns: DatasetColumn[],
): FilterValidation {
  const errors: Record<string, string> = {};
  const filters: SemanticSearchFilter[] = [];

  for (const draft of drafts) {
    const column = findColumn(columns, draft.column);
    const error = draftError(draft, column);
    if (error) {
      errors[draft.id] = error;
      continue;
    }
    // `is_null` / `is_not_null` no llevan `value`: el backend responde 400 si lo reciben.
    filters.push({
      column: draft.column,
      operator: draft.operator as SemanticOperatorValue,
      ...(operatorNeedsValue(draft.operator as SemanticOperatorValue)
        ? { value: draft.value.trim() }
        : {}),
    });
  }

  return { errors, filters };
}

export function validateQuestion(question: string): string | null {
  const trimmed = question.trim();
  if (!trimmed) return "Escribe una pregunta.";
  if (trimmed.length > MAX_QUESTION_LENGTH) {
    return `La pregunta puede tener hasta ${MAX_QUESTION_LENGTH} caracteres.`;
  }
  return null;
}

export function validateTopK(topK: number): string | null {
  if (!Number.isInteger(topK) || topK < MIN_TOP_K || topK > MAX_TOP_K) {
    return `El número de resultados debe estar entre ${MIN_TOP_K} y ${MAX_TOP_K}.`;
  }
  return null;
}

export function buildSearchRequest(
  datasetId: string,
  question: string,
  topK: number,
  drafts: FilterDraft[],
  columns: DatasetColumn[],
): SemanticSearchRequest {
  const { filters } = buildFilters(drafts, columns);
  return {
    datasetId,
    question: question.trim(),
    filters: filters.length > 0 ? filters : undefined,
    topK,
  };
}
