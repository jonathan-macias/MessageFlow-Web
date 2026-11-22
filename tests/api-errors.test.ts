import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { activateFlow, getDatasets } from "@/lib/api";

const RATE_LIMIT_MESSAGE = "Too many requests. Please wait a moment and try again.";

function emptyResponse(status: number, statusText = "", headers: Record<string, string> = {}) {
  return new Response(null, { status, statusText, headers });
}

function jsonResponse(status: number, body: unknown, statusText = "") {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/problem+json" },
  });
}

async function catchError(promise: Promise<unknown>): Promise<Record<string, unknown>> {
  try {
    await promise;
  } catch (error) {
    return error as Record<string, unknown>;
  }
  throw new Error("Expected the request to be rejected");
}

describe("API error mapping", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("429 Too Many Requests", () => {
    it("builds a non-empty English detail for an empty body and an empty statusText (request)", async () => {
      fetchMock.mockResolvedValue(emptyResponse(429, ""));

      const error = await catchError(getDatasets());

      expect(error).toMatchObject({
        type: "about:blank",
        status: 429,
        httpStatus: 429,
        detail: RATE_LIMIT_MESSAGE,
      });
      expect(typeof error.title).toBe("string");
      expect(error.title).not.toBe("");
      // Pages do `e.detail ?? "fallback"`: an empty string would hide the message.
      expect(error.detail).not.toBe("");
    });

    it("builds the same detail for requestVoid", async () => {
      fetchMock.mockResolvedValue(emptyResponse(429, ""));

      const error = await catchError(activateFlow("flow-1"));

      expect(error).toMatchObject({ status: 429, httpStatus: 429, detail: RATE_LIMIT_MESSAGE });
    });

    it("ignores statusText for 429", async () => {
      fetchMock.mockResolvedValue(emptyResponse(429, "Too Many Requests"));

      const error = await catchError(getDatasets());

      expect(error.detail).toBe(RATE_LIMIT_MESSAGE);
    });

    it("appends the Retry-After seconds when the header is present", async () => {
      fetchMock.mockResolvedValue(emptyResponse(429, "", { "Retry-After": "30" }));

      const error = await catchError(getDatasets());

      expect(error.detail).toBe(`${RATE_LIMIT_MESSAGE} Try again in 30 seconds.`);
    });

    it("uses the singular for a 1 second Retry-After", async () => {
      fetchMock.mockResolvedValue(emptyResponse(429, "", { "Retry-After": "1" }));

      const error = await catchError(activateFlow("flow-1"));

      expect(error.detail).toBe(`${RATE_LIMIT_MESSAGE} Try again in 1 second.`);
    });

    it("ignores a Retry-After that is not a number of seconds", async () => {
      fetchMock.mockResolvedValue(
        emptyResponse(429, "", { "Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT" }),
      );

      const error = await catchError(getDatasets());

      expect(error.detail).toBe(RATE_LIMIT_MESSAGE);
    });

    it("keeps the server detail when the 429 body does carry one", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(429, {
          type: "about:blank",
          title: "Too Many Requests",
          status: 429,
          detail: "Daily AI quota exceeded.",
        }),
      );

      const error = await catchError(getDatasets());

      expect(error).toMatchObject({ status: 429, httpStatus: 429, detail: "Daily AI quota exceeded." });
    });
  });

  describe("other statuses", () => {
    it("uses statusText when there is no body", async () => {
      fetchMock.mockResolvedValue(emptyResponse(502, "Bad Gateway"));

      const error = await catchError(getDatasets());

      expect(error).toMatchObject({
        type: "about:blank",
        status: 502,
        httpStatus: 502,
        detail: "Bad Gateway",
      });
    });

    it("falls back to 'Request failed.' when there is no body and no statusText", async () => {
      fetchMock.mockResolvedValue(emptyResponse(500, ""));

      const error = await catchError(getDatasets());

      expect(error.detail).toBe("Request failed.");
      expect(error.httpStatus).toBe(500);
    });

    it("treats an empty detail in a JSON body as missing", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(500, { type: "about:blank", title: "Internal Server Error", status: 500, detail: "" }),
      );

      const error = await catchError(getDatasets());

      expect(error.detail).toBe("Request failed.");
      expect(error.title).toBe("Internal Server Error");
    });

    it("keeps the parsed RFC 7807 body, including code and errors, and adds httpStatus", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(400, {
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "One or more validation errors occurred.",
          code: "validation_failed",
          errors: { question: ["The question field is required."] },
        }),
      );

      const error = await catchError(getDatasets());

      expect(error).toEqual({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "One or more validation errors occurred.",
        code: "validation_failed",
        errors: { question: ["The question field is required."] },
        httpStatus: 400,
      });
    });

    it("preserves a non-numeric status sent by the server (semantic-search indexing state)", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(409, {
          title: "Conflict",
          status: "Indexing",
          code: "semantic_search_indexing",
          detail: "The dataset is being indexed.",
        }),
      );

      const error = await catchError(getDatasets());

      expect(error).toMatchObject({ status: "Indexing", httpStatus: 409, code: "semantic_search_indexing" });
    });
  });
});
