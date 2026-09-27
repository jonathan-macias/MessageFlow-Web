export interface GenerateMessageRequest {
  description: string;
  tone: string;
  datasetId: string;
}

export interface GenerateMessageVariable {
  id: string;
  name: string;
  dataType: number;
}

export interface GenerateMessageResponse {
  messageTemplate: string;
  variables: GenerateMessageVariable[];
}

// ── Dataset Query ─────────────────────────────────────

export interface DatasetQueryRequest {
  datasetId: string;
  question: string;
}

export interface DatasetQueryFilter {
  column: string;
  operator: string;
  value: string;
}

export interface DatasetQueryStructured {
  action: string;
  targetColumn: string | null;
  groupByColumn: string | null;
  limit: number | null;
  filters: DatasetQueryFilter[];
}

export interface DatasetQueryResponse {
  answer: string;
  query: DatasetQueryStructured;
  data: Record<string, number> | null;
  rows: Array<Record<string, string | null>> | null;
}

// ── Semantic search (RAG) ─────────────────────────────

export type SemanticOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "greater_than_or_equal"
  | "less_than"
  | "less_than_or_equal"
  | "is_null"
  | "is_not_null";

export interface SemanticSearchFilter {
  column: string;
  operator: SemanticOperator;
  value?: string | null;
}

export interface SemanticSearchRequest {
  datasetId: string;
  question: string;
  filters?: SemanticSearchFilter[];
  topK?: number;
}

export interface SemanticSearchMatch {
  rowId: string;
  rowNumber: number;
  similarity: number;
  values: Record<string, string | null>;
}

export interface SemanticSearchAppliedFilter {
  column: string;
  operator: string;
  value: string | null;
}

export interface SemanticSearchResponse {
  answer: string;
  topK: number;
  appliedFilters: SemanticSearchAppliedFilter[];
  matches: SemanticSearchMatch[];
  indexedRows: number;
  totalRows: number;
}

export type SemanticIndexingStatus = "Pending" | "Indexing" | "Failed";
