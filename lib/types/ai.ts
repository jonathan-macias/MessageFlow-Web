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
