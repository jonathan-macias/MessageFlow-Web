import type { AuthResponse, LoginRequest, RegisterRequest, GoogleLoginRequest, Rfc7807Error } from "./types/auth";
import type { DatasetListItem, DatasetDetail, DatasetColumn, PaginatedRows, UploadDatasetResponse } from "./types/dataset";
import type { CreateFlowRequest, CreateFlowResponse, PaginatedFlows } from "./types/flow";

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

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const error: Rfc7807Error = body ?? {
      type: "about:blank",
      title: "Error",
      status: res.status,
      detail: res.statusText,
    };
    throw error;
  }

  return res.json() as Promise<T>;
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
