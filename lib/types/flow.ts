// ── Lists & Pagination ────────────────────────────────

export interface FlowListItem {
  id: string;
  name: string;
  status: number;
  channel: number;
  executionType: number;
  createdAtUtc: string;
}

export interface PaginatedFlows {
  items: FlowListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Detail ────────────────────────────────────────────

export interface FlowDetail {
  id: string;
  name: string;
  description: string;
  status: number;
  channel: number;
  datasetId: string;
  recipientColumnId: string;
  messageTemplateText: string;
  rootFilter: FlowFilter | null;
  schedule: ScheduleDetail;
  dataTrigger: unknown | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface ScheduleDetail {
  type: number;
  timeZone: string;
  runAtUtc: string | null;
  recurrenceTimeOfDay: string | null;
  recurrenceIntervalDays: number | null;
}

// ── Create / Update ───────────────────────────────────

export interface CreateFlowRequest {
  name: string;
  description: string;
  datasetId: string;
  channel: number;
  messageTemplate: string;
  schedule: ScheduleRequest;
}

export interface ScheduleRequest {
  type: number;
  timeZone: string;
  runAtUtc?: string | null;
  recurrenceTimeOfDay?: string | null;
  recurrenceIntervalDays?: number | null;
}

export interface CreateFlowResponse {
  id: string;
}

export interface UpdateFlowRequest {
  name: string;
  description: string;
  schedule?: ScheduleRequest;
}

export interface UpdateMessageRequest {
  message: string;
}

// ── Filter ────────────────────────────────────────────

export interface FlowFilter {
  composition: number;
  conditions: FilterCondition[];
  groups: FilterGroup[] | null;
}

export interface FilterCondition {
  columnId: string;
  operator: number;
  value: string;
}

export interface FilterGroup {
  composition: number;
  conditions: FilterCondition[];
  groups: FilterGroup[] | null;
}

// ── Execute ───────────────────────────────────────────

export interface ExecuteFlowResponse {
  executionId: string;
}

// ── Executions ────────────────────────────────────────

export interface FlowExecution {
  id: string;
  flowId: string;
  status: number;
  triggerSource: number;
  startedAtUtc: string;
  completedAtUtc: string | null;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
}

export interface FlowExecutionDetail {
  id: string;
  flowId: string;
  executionType: number;
  idempotencyKey: string;
  status: number;
  triggerSource: number;
  startedAtUtc: string;
  completedAtUtc: string | null;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errorMessage: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface PaginatedExecutions {
  items: FlowExecution[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Preview ───────────────────────────────────────────

export interface PreviewMessageRequest {
  datasetRowId?: string | null;
  sampleValues?: Record<string, string> | null;
  missingVariablePolicy?: number;
}

export interface PreviewMessageResponse {
  renderedMessage: string;
  missingVariables: string[];
}

export interface PreviewFilterRequest {
  filter: FlowFilter | null;
  sampleLimit: number;
}

export interface SampleRow {
  id: string;
  rowNumber: number;
  values: Record<string, string | null>;
}

export interface PreviewFilterResponse {
  matchingRowCount: number;
  sampleRows: SampleRow[];
}

// ── Lookup Maps ───────────────────────────────────────

export const FlowStatus: Record<number, string> = {
  1: "Draft",
  2: "Active",
  3: "Paused",
  4: "Completed",
  5: "Archived",
};

export const ExecutionType: Record<number, string> = {
  1: "OneTime",
  2: "Recurring",
  3: "DataTriggered",
  4: "Immediate",
};

export const ChannelType: Record<number, string> = {
  1: "WhatsApp",
};

export const TriggerSource: Record<number, string> = {
  1: "Manual",
  2: "Scheduled",
  3: "DataMatch",
};

export const ExecutionStatus: Record<number, string> = {
  1: "Pending",
  2: "Running",
  3: "Completed",
  4: "PartiallyCompleted",
  5: "Failed",
  6: "Cancelled",
};

export const FilterComposition: Record<number, string> = {
  1: "And",
  2: "Or",
};

export const FilterOperator: Record<number, string> = {
  1: "IsNull",
  2: "IsNotNull",
  3: "Equals",
  4: "NotEquals",
  5: "Contains",
  6: "StartsWith",
  7: "EndsWith",
  8: "GreaterThan",
  9: "GreaterThanOrEqual",
  10: "LessThan",
  11: "LessThanOrEqual",
};
