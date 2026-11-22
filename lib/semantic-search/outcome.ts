import { semanticSearch } from "@/lib/api";
import type {
  SemanticIndexingStatus,
  SemanticSearchRequest,
  SemanticSearchResponse,
} from "@/lib/types/ai";

export const SEMANTIC_INDEXING_CODE = "semantic_search_indexing";
export const SEMANTIC_VALIDATION_CODE = "validation_failed";

const RATE_LIMITED_FALLBACK = "Too many requests. Please wait a moment and try again.";

export type SemanticSearchOutcome =
  | { kind: "success"; response: SemanticSearchResponse }
  | { kind: "indexing"; indexingStatus: SemanticIndexingStatus | null }
  | { kind: "validation"; fieldErrors: Record<string, string[]>; detail: string }
  | { kind: "business-rule"; detail: string }
  | { kind: "not-found" }
  | { kind: "unavailable"; detail: string }
  | { kind: "unauthorized" }
  | { kind: "rate-limited"; detail: string }
  | { kind: "server-error"; detail: string };

interface ProblemLike {
  type?: unknown;
  title?: unknown;
  status?: unknown;
  detail?: unknown;
  code?: unknown;
  errors?: unknown;
  httpStatus?: unknown;
}

function normalizeFieldErrors(value: unknown): Record<string, string[]> {
  if (typeof value !== "object" || value === null) return {};
  const result: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(messages)) {
      result[field] = messages.filter((m): m is string => typeof m === "string");
    } else if (typeof messages === "string") {
      result[field] = [messages];
    }
  }
  return result;
}

function readHttpStatus(problem: ProblemLike): number {
  if (typeof problem.httpStatus === "number") return problem.httpStatus;
  if (typeof problem.status === "number") return problem.status;
  return 0;
}

function readIndexingStatus(problem: ProblemLike): SemanticIndexingStatus | null {
  const status = problem.status;
  if (status === "Pending" || status === "Indexing" || status === "Failed") return status;
  return null;
}

function readCode(problem: ProblemLike): string | null {
  return typeof problem.code === "string" ? problem.code : null;
}

function readDetail(problem: ProblemLike): string {
  return typeof problem.detail === "string" ? problem.detail : "";
}

export function toSemanticSearchOutcome(error: unknown): SemanticSearchOutcome {
  if (typeof error !== "object" || error === null) {
    return { kind: "server-error", detail: "" };
  }

  const problem = error as ProblemLike;
  const status = readHttpStatus(problem);
  const code = readCode(problem);
  const detail = readDetail(problem);

  if (status === 409 && code === SEMANTIC_INDEXING_CODE) {
    return { kind: "indexing", indexingStatus: readIndexingStatus(problem) };
  }

  if (status === 400 && code === SEMANTIC_VALIDATION_CODE) {
    return { kind: "validation", fieldErrors: normalizeFieldErrors(problem.errors), detail };
  }

  if (status === 400) {
    return { kind: "business-rule", detail };
  }

  if (status === 404) {
    return { kind: "not-found" };
  }

  if (status === 503) {
    return { kind: "unavailable", detail };
  }

  if (status === 401) {
    return { kind: "unauthorized" };
  }

  if (status === 429) {
    return { kind: "rate-limited", detail: detail || RATE_LIMITED_FALLBACK };
  }

  return { kind: "server-error", detail };
}

export async function runSemanticSearch(
  request: SemanticSearchRequest,
): Promise<SemanticSearchOutcome> {
  try {
    const response = await semanticSearch(request);
    return { kind: "success", response };
  } catch (error) {
    return toSemanticSearchOutcome(error);
  }
}
