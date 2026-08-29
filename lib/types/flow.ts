export interface FlowListItem {
  id: string;
  name: string;
  status: number;
  channel: number;
  executionType: number;
  createdAtUtc: string;
}

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

export interface PaginatedFlows {
  items: FlowListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const ExecutionType: Record<number, string> = {
  1: "OneTime",
  2: "Recurring",
  3: "DataTriggered",
  4: "Immediate",
};

export const ChannelType: Record<number, string> = {
  1: "WhatsApp",
};
