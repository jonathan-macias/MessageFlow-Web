import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  semanticSearch: vi.fn(),
}));

vi.mock("@/lib/api", () => api);

import { runSemanticSearch, toSemanticSearchOutcome } from "@/lib/semantic-search/outcome";

describe("toSemanticSearchOutcome", () => {
  it("maps HTTP 429 to the rate-limited outcome and keeps the detail", () => {
    const outcome = toSemanticSearchOutcome({
      type: "about:blank",
      title: "Too Many Requests",
      status: 429,
      detail: "Too many requests. Please wait a moment and try again. Try again in 5 seconds.",
      httpStatus: 429,
    });

    expect(outcome).toEqual({
      kind: "rate-limited",
      detail: "Too many requests. Please wait a moment and try again. Try again in 5 seconds.",
    });
  });

  it("uses the httpStatus even when the body status is not numeric", () => {
    const outcome = toSemanticSearchOutcome({ status: "whatever", httpStatus: 429, detail: "Slow down." });

    expect(outcome).toEqual({ kind: "rate-limited", detail: "Slow down." });
  });

  it("falls back to a non-empty English message when a 429 has no detail", () => {
    const outcome = toSemanticSearchOutcome({ status: 429, httpStatus: 429, detail: "" });

    expect(outcome.kind).toBe("rate-limited");
    if (outcome.kind === "rate-limited") {
      expect(outcome.detail).toBe("Too many requests. Please wait a moment and try again.");
    }
  });

  it("does not treat other statuses as rate-limited", () => {
    expect(toSemanticSearchOutcome({ httpStatus: 500, detail: "Boom" })).toEqual({
      kind: "server-error",
      detail: "Boom",
    });
    expect(toSemanticSearchOutcome({ httpStatus: 503, detail: "Off" })).toEqual({
      kind: "unavailable",
      detail: "Off",
    });
    expect(toSemanticSearchOutcome({ httpStatus: 401 })).toEqual({ kind: "unauthorized" });
  });

  it("keeps mapping the indexing state from the body status", () => {
    expect(
      toSemanticSearchOutcome({ httpStatus: 409, code: "semantic_search_indexing", status: "Indexing" }),
    ).toEqual({ kind: "indexing", indexingStatus: "Indexing" });
  });
});

describe("runSemanticSearch", () => {
  beforeEach(() => {
    api.semanticSearch.mockReset();
  });

  it("returns the rate-limited outcome when the API rejects with a 429 problem", async () => {
    api.semanticSearch.mockRejectedValue({
      type: "about:blank",
      title: "Too Many Requests",
      status: 429,
      detail: "Too many requests. Please wait a moment and try again.",
      httpStatus: 429,
    });

    const outcome = await runSemanticSearch({ datasetId: "d1", question: "q" });

    expect(outcome).toEqual({
      kind: "rate-limited",
      detail: "Too many requests. Please wait a moment and try again.",
    });
  });
});
