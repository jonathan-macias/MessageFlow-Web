import type { AuthResponse, LoginRequest, RegisterRequest, GoogleLoginRequest, Rfc7807Error } from "./types/auth";
import type { DatasetListItem, DatasetDetail, DatasetColumn, PaginatedRows, UploadDatasetResponse } from "./types/dataset";
import type {
  CreateFlowRequest, CreateFlowResponse, FlowDetail, PaginatedFlows,
  UpdateFlowRequest, UpdateMessageRequest, FlowFilter,
  ExecuteFlowResponse, PaginatedExecutions, FlowExecutionDetail,
  PreviewMessageRequest, PreviewMessageResponse,
  PreviewFilterRequest, PreviewFilterResponse,
} from "./types/flow";
import type {
  GenerateMessageRequest,
  GenerateMessageResponse,
  DatasetQueryRequest,
  DatasetQueryResponse,
  SemanticSearchRequest,
  SemanticSearchResponse,
} from "./types/ai";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7110";

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("auth");
    if (!raw) return null;
    const data = JSON.parse(raw) as AuthResponse;
    return data.accessToken;
  } catch {
    return null;
  }
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

const RATE_LIMIT_DETAIL = "Too many requests. Please wait a moment and try again.";
const GENERIC_ERROR_DETAIL = "Request failed.";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function fallbackDetail(res: Response): string {
  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After")?.trim() ?? "";
    // Retry-After can also be an HTTP date; only the delay-seconds form is rendered.
    if (/^\d+$/.test(retryAfter)) {
      const seconds = Number(retryAfter);
      if (seconds > 0) {
        return `${RATE_LIMIT_DETAIL} Try again in ${seconds} ${seconds === 1 ? "second" : "seconds"}.`;
      }
    }
    return RATE_LIMIT_DETAIL;
  }
  return res.statusText || GENERIC_ERROR_DETAIL;
}

/**
 * Builds the error thrown for a non-2xx response. Some responses (notably 429 from
 * rate limiting) come with an empty body and, over HTTP/2, an empty `statusText`, so
 * `detail` must never end up as an empty string: callers use `e.detail ?? "fallback"`.
 */
async function toApiError(res: Response): Promise<Rfc7807Error> {
  const parsed: unknown = await res.json().catch(() => null);
  const body =
    typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Partial<Rfc7807Error>)
      : null;

  const detail = isNonEmptyString(body?.detail) ? body.detail : fallbackDetail(res);
  const title = isNonEmptyString(body?.title)
    ? body.title
    : res.status === 429
      ? "Too Many Requests"
      : "Error";

  // `status` is kept exactly as the server sent it: the semantic-search 409 body uses it
  // for the indexing state ("Pending" | "Indexing" | "Failed"), not for the HTTP code.
  return {
    type: "about:blank",
    status: res.status,
    ...body,
    title,
    detail,
    httpStatus: res.status,
  };
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const headers = buildHeaders(options.headers as Record<string, string>);

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    throw await toApiError(res);
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

async function requestVoid(path: string, options: RequestInit): Promise<void> {
  const headers = buildHeaders(options.headers as Record<string, string>);
  headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    throw await toApiError(res);
  }
}

// ── Auth ──────────────────────────────────────────────

export function login(data: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function register(data: RegisterRequest): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function loginWithGoogle(data: GoogleLoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Datasets ──────────────────────────────────────────

export function getDatasets(): Promise<DatasetListItem[]> {
  return request<DatasetListItem[]>("/api/datasets", { method: "GET" });
}

export function getDataset(id: string): Promise<DatasetDetail> {
  return request<DatasetDetail>(`/api/datasets/${id}`, { method: "GET" });
}

export function getDatasetColumns(id: string): Promise<DatasetColumn[]> {
  return request<DatasetColumn[]>(`/api/datasets/${id}/columns`, { method: "GET" });
}

export function getDatasetRows(
  id: string,
  page: number,
  pageSize: number,
): Promise<PaginatedRows> {
  return request<PaginatedRows>(
    `/api/datasets/${id}/rows?page=${page}&pageSize=${pageSize}`,
    { method: "GET" },
  );
}

export function uploadDataset(
  file: File,
  name: string,
  phoneColumn: string,
): Promise<UploadDatasetResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name);
  formData.append("phoneColumn", phoneColumn);

  return request<UploadDatasetResponse>("/api/datasets/upload", {
    method: "POST",
    body: formData,
  });
}

// ── Flows ─────────────────────────────────────────────

export function getFlows(
  page: number,
  pageSize: number,
): Promise<PaginatedFlows> {
  return request<PaginatedFlows>(
    `/api/flows?page=${page}&pageSize=${pageSize}`,
    { method: "GET" },
  );
}

export function createFlow(data: CreateFlowRequest): Promise<CreateFlowResponse> {
  return request<CreateFlowResponse>("/api/flows", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getFlow(id: string): Promise<FlowDetail> {
  return request<FlowDetail>(`/api/flows/${id}`, { method: "GET" });
}

export function updateFlow(id: string, data: UpdateFlowRequest): Promise<void> {
  return requestVoid(`/api/flows/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteFlow(id: string): Promise<void> {
  return requestVoid(`/api/flows/${id}`, { method: "DELETE" });
}

export function updateFlowMessage(id: string, data: UpdateMessageRequest): Promise<void> {
  return requestVoid(`/api/flows/${id}/message`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function updateFlowFilter(id: string, filter: FlowFilter | null): Promise<void> {
  return requestVoid(`/api/flows/${id}/filter`, {
    method: "PUT",
    body: JSON.stringify({ filter }),
  });
}

export function activateFlow(id: string): Promise<void> {
  return requestVoid(`/api/flows/${id}/activate`, { method: "POST" });
}

export function pauseFlow(id: string): Promise<void> {
  return requestVoid(`/api/flows/${id}/pause`, { method: "POST" });
}

export function archiveFlow(id: string): Promise<void> {
  return requestVoid(`/api/flows/${id}/archive`, { method: "POST" });
}

export function executeFlow(id: string): Promise<ExecuteFlowResponse> {
  return request<ExecuteFlowResponse>(`/api/flows/${id}/execute`, {
    method: "POST",
  });
}

export function getFlowExecutions(
  id: string,
  page: number,
  pageSize: number,
): Promise<PaginatedExecutions> {
  return request<PaginatedExecutions>(
    `/api/flows/${id}/executions?page=${page}&pageSize=${pageSize}`,
    { method: "GET" },
  );
}

export function previewFlowMessage(
  id: string,
  data: PreviewMessageRequest,
): Promise<PreviewMessageResponse> {
  return request<PreviewMessageResponse>(`/api/flows/${id}/preview`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function previewFlowFilter(
  id: string,
  data: PreviewFilterRequest,
): Promise<PreviewFilterResponse> {
  return request<PreviewFilterResponse>(`/api/flows/${id}/filters/preview`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getFlowExecutionDetail(id: string): Promise<FlowExecutionDetail> {
  return request<FlowExecutionDetail>(`/api/flow-executions/${id}`, { method: "GET" });
}

// ── AI ────────────────────────────────────────────────

export function generateMessage(data: GenerateMessageRequest): Promise<GenerateMessageResponse> {
  return request<GenerateMessageResponse>("/api/ai/messages/generate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function queryDataset(data: DatasetQueryRequest): Promise<DatasetQueryResponse> {
  return request<DatasetQueryResponse>("/api/ai/datasets/query", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function semanticSearch(data: SemanticSearchRequest): Promise<SemanticSearchResponse> {
  return request<SemanticSearchResponse>("/api/ai/datasets/semantic-search", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
