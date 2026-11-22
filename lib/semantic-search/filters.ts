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
  if (!draft.column) return "Choose a column.";
  if (!column) return "The chosen column does not exist in this dataset.";
  if (!draft.operator) return "Choose an operator.";
  if (!operatorsForDataType(column.dataType).includes(draft.operator)) {
    return `That operator is not valid for ${dataTypeLabel(column.dataType).toLowerCase()} columns.`;
  }
  if (operatorNeedsValue(draft.operator) && !draft.value.trim()) {
    return "Enter a value for this operator.";
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
  if (!trimmed) return "Enter a question.";
  if (trimmed.length > MAX_QUESTION_LENGTH) {
    return `The question can be up to ${MAX_QUESTION_LENGTH} characters long.`;
  }
  return null;
}

export function validateTopK(topK: number): string | null {
  if (!Number.isInteger(topK) || topK < MIN_TOP_K || topK > MAX_TOP_K) {
    return `The number of results must be between ${MIN_TOP_K} and ${MAX_TOP_K}.`;
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
