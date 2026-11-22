import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DatasetColumn } from "@/lib/types/dataset";
import type { SemanticSearchResponse } from "@/lib/types/ai";

const api = vi.hoisted(() => ({
  getDataset: vi.fn(),
  getDatasetColumns: vi.fn(),
  semanticSearch: vi.fn(),
}));

vi.mock("@/lib/api", () => api);

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "dataset-1" }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/context/auth-context", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

import SemanticSearchPage from "@/app/datasets/[id]/semantic-search/page";

const DATASET_ID = "dataset-1";

const dataset = {
  id: DATASET_ID,
  name: "Customers",
  sourceFileName: "customers.csv",
  rowCount: 120,
  phoneColumn: "Phone",
  createdAtUtc: "2026-01-01T00:00:00Z",
};

const columns: DatasetColumn[] = [
  { id: "c1", name: "Name", dataType: 1 },
  { id: "c2", name: "City", dataType: 1 },
  { id: "c3", name: "Balance", dataType: 2 },
  { id: "c4", name: "ActiveCustomer", dataType: 4 },
];

function indexingProblem(status: unknown = "Pending") {
  return {
    type: "https://messageflow.app/problems/semantic-search-indexing",
    title: "Semantic search indexing",
    status,
    code: "semantic_search_indexing",
    detail: "The dataset is being indexed.",
    httpStatus: 409,
  };
}

function response(overrides: Partial<SemanticSearchResponse> = {}): SemanticSearchResponse {
  return {
    answer: "I found 1 row similar to what you describe.",
    topK: 10,
    appliedFilters: [],
    matches: [
      {
        rowId: "row-1",
        rowNumber: 7,
        similarity: 0.95,
        values: { Name: "Ana Ruiz", City: "Bucaramanga", Balance: "820000", ActiveCustomer: "true" },
      },
    ],
    indexedRows: 118,
    totalRows: 120,
    ...overrides,
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function renderPage() {
  render(<SemanticSearchPage />);
  await flush();
  await screen.findByLabelText("What are you looking for?");
}

function typeQuestion(text: string) {
  fireEvent.change(screen.getByLabelText("What are you looking for?"), { target: { value: text } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
}

describe("Semantic search", () => {
  beforeEach(() => {
    api.getDataset.mockReset().mockResolvedValue(dataset);
    api.getDatasetColumns.mockReset().mockResolvedValue(columns);
    api.semanticSearch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads the 200 response and shows the matches with relevance as a percentage", async () => {
    api.semanticSearch.mockResolvedValue(response());
    await renderPage();

    typeQuestion("customers in Bucaramanga who buy the most");
    submit();
    await flush();

    expect(api.semanticSearch).toHaveBeenCalledWith({
      datasetId: DATASET_ID,
      question: "customers in Bucaramanga who buy the most",
      filters: undefined,
      topK: 10,
    });

    expect(await screen.findByText(/I found 1 row similar/)).toBeInTheDocument();
    expect(screen.getByText("relevance 95%")).toBeInTheDocument();
    expect(screen.getByText("Row 7 of the file")).toBeInTheDocument();
    // Values are formatted according to the column dataType.
    expect(screen.getByText("Ana Ruiz")).toBeInTheDocument();
    expect(screen.getByText("820,000")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(
      screen.getByText(/only 118 have text columns/),
    ).toBeInTheDocument();
  });

  it("treats empty matches with a 200 as 'no matches', not as a failure", async () => {
    api.semanticSearch.mockResolvedValue(
      response({
        answer: "No matching records were found for that question.",
        matches: [],
      }),
    );
    await renderPage();

    typeQuestion("none of my customers speak English");
    submit();
    await flush();

    expect(await screen.findByText("No matches")).toBeInTheDocument();
    expect(
      screen.getByText("No matching records were found for that question."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Something went wrong on our side/)).not.toBeInTheDocument();
  });

  it("shows the indexing state on 409 and retries on its own until there are results", async () => {
    await renderPage();
    vi.useFakeTimers();
    api.semanticSearch
      .mockRejectedValueOnce(indexingProblem("Indexing"))
      .mockResolvedValueOnce(response({ answer: "Done: one row matches." }));

    typeQuestion("customers from bucaramanga");
    submit();
    await flush();

    const notice = screen.getByText("Preparing this dataset for semantic search");
    expect(notice).toBeInTheDocument();
    // It is an informational state, not an error: announced with aria-live, no red alert.
    expect(notice.closest("[aria-live='polite']")).not.toBeNull();
    expect(screen.queryByText(/Something went wrong on our side/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Automatic retry every 25 s \(attempt 1 of 20\)/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry now" })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(25_000);
    });
    await flush();

    expect(api.semanticSearch).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Done: one row matches.")).toBeInTheDocument();
    expect(screen.getByText("Semantic search is ready.")).toBeInTheDocument();
    expect(
      screen.queryByText("Preparing this dataset for semantic search"),
    ).not.toBeInTheDocument();
  });

  it("respects the maximum retries and offers a manual retry", async () => {
    await renderPage();
    vi.useFakeTimers();
    api.semanticSearch.mockRejectedValue({
      type: "https://messageflow.app/problems/semantic-search-indexing",
      title: "Conflict",
      status: 409,
      code: "semantic_search_indexing",
      detail: "Indexing.",
      httpStatus: 409,
    });

    typeQuestion("customers from bucaramanga");
    submit();
    await flush();
    expect(api.semanticSearch).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 19; i += 1) {
      await act(async () => {
        vi.advanceTimersByTime(25_000);
      });
      await flush();
    }

    expect(api.semanticSearch).toHaveBeenCalledTimes(20);
    expect(
      screen.getByText("We are still waiting for the server. You can retry whenever you like."),
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(120_000);
    });
    expect(api.semanticSearch).toHaveBeenCalledTimes(20);
  });

  it("stops the automatic retry if the user edits the question", async () => {
    await renderPage();
    vi.useFakeTimers();
    api.semanticSearch.mockRejectedValue(indexingProblem());

    typeQuestion("customers from bucaramanga");
    submit();
    await flush();
    expect(api.semanticSearch).toHaveBeenCalledTimes(1);

    typeQuestion("customers from cali");
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(api.semanticSearch).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText("Preparing this dataset for semantic search"),
    ).not.toBeInTheDocument();
  });

  it("answers 404 without hinting that the dataset exists", async () => {
    api.getDataset.mockRejectedValue({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: "Not Found",
      httpStatus: 404,
    });

    render(<SemanticSearchPage />);
    await flush();

    expect(screen.getByText("We could not find this dataset.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to my datasets" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
    expect(screen.queryByText(/another user/)).not.toBeInTheDocument();
  });

  it("answers a search 404 without hinting that the resource exists", async () => {
    api.semanticSearch.mockRejectedValue({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: "Not Found",
      httpStatus: 404,
    });
    await renderPage();

    typeQuestion("customers from bucaramanga");
    submit();
    await flush();

    expect(screen.getByText("We could not find this dataset.")).toBeInTheDocument();
  });

  it("hides semantic search on 503 and offers the structured query", async () => {
    api.semanticSearch.mockRejectedValue({
      type: "about:blank",
      title: "Service Unavailable",
      status: 503,
      detail: "Semantic search is disabled.",
      httpStatus: 503,
    });
    await renderPage();

    typeQuestion("customers from bucaramanga");
    submit();
    await flush();

    expect(
      screen.getByText("Semantic search is not available."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "structured query" })).toHaveAttribute(
      "href",
      `/datasets/${DATASET_ID}/query`,
    );
    expect(screen.queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
  });

  it("shows validation errors next to the field", async () => {
    api.semanticSearch.mockRejectedValue({
      type: "about:blank",
      title: "Bad Request",
      status: 400,
      code: "validation_failed",
      detail: "One or more validation errors occurred.",
      errors: { question: ["The question field is required."] },
      httpStatus: 400,
    });
    await renderPage();

    typeQuestion("x");
    submit();
    await flush();

    expect(screen.getByText("The question field is required.")).toBeInTheDocument();
    expect(screen.getByText("Check the highlighted fields.")).toBeInTheDocument();
  });

  it("treats a 400 without a code as a business rule, not a form error", async () => {
    api.semanticSearch.mockRejectedValue({
      type: "about:blank",
      title: "Bad Request",
      status: 400,
      detail: "Column 'Balance' does not exist in this dataset.",
      httpStatus: 400,
    });
    await renderPage();

    typeQuestion("customers with a high balance");
    submit();
    await flush();

    expect(screen.getByText("We could not run this search.")).toBeInTheDocument();
    expect(screen.getByText("Column 'Balance' does not exist in this dataset.")).toBeInTheDocument();
    expect(screen.queryByText(/Something went wrong on our side/)).not.toBeInTheDocument();
  });

  it("offers the structured query if the dataset has no text columns", async () => {
    api.getDatasetColumns.mockResolvedValue([{ id: "c3", name: "Balance", dataType: 2 }]);

    render(<SemanticSearchPage />);
    await flush();

    expect(
      screen.getByText(/has no text columns, so it does not support semantic search/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "structured query" })).toHaveAttribute(
      "href",
      `/datasets/${DATASET_ID}/query`,
    );
    expect(screen.queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
  });

  it("sends the numeric filter and omits value on is_null", async () => {
    api.semanticSearch.mockResolvedValue(
      response({
        appliedFilters: [{ column: "Balance", operator: "equals", value: "500000" }],
      }),
    );
    await renderPage();

    typeQuestion("customers with a high balance");
    fireEvent.click(screen.getByRole("button", { name: "Add filter" }));
    fireEvent.change(screen.getByLabelText("Column of filter 1"), {
      target: { value: "Balance" },
    });
    fireEvent.change(screen.getByLabelText("Filter value for Balance"), {
      target: { value: "500000" },
    });
    submit();
    await flush();

    expect(api.semanticSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ column: "Balance", operator: "equals", value: "500000" }],
      }),
    );
    expect(await screen.findByText(/Balance is equal to "500000"/)).toBeInTheDocument();

    // is_null must not send value: the backend answers 400 if it receives one.
    fireEvent.click(screen.getByRole("button", { name: "Add filter" }));
    fireEvent.change(screen.getByLabelText("Column of filter 2"), {
      target: { value: "City" },
    });
    fireEvent.change(screen.getByLabelText("Operator of filter 2"), {
      target: { value: "is_null" },
    });
    expect(screen.queryByLabelText("Filter value for City")).not.toBeInTheDocument();
    submit();
    await flush();

    const lastCall = api.semanticSearch.mock.calls.at(-1)?.[0];
    expect(lastCall.filters).toHaveLength(2);
    expect(lastCall.filters[1]).toEqual({ column: "City", operator: "is_null" });
    expect(Object.hasOwn(lastCall.filters[1], "value")).toBe(false);
  });

  it("offers a retry on a server error", async () => {
    api.semanticSearch
      .mockRejectedValueOnce({
        type: "about:blank",
        title: "Internal Server Error",
        status: 500,
        detail: "",
        httpStatus: 500,
      })
      .mockResolvedValueOnce(response({ answer: "Now it works: one row matches." }));
    await renderPage();

    typeQuestion("customers from bucaramanga");
    submit();
    await flush();

    expect(screen.getByText("Something went wrong on our side.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await flush();

    expect(api.semanticSearch).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Now it works: one row matches.")).toBeInTheDocument();
  });

  it("shows a rate-limit notice on 429 with the server detail and a retry button", async () => {
    api.semanticSearch
      .mockRejectedValueOnce({
        type: "about:blank",
        title: "Too Many Requests",
        status: 429,
        detail: "Too many requests. Please wait a moment and try again. Try again in 12 seconds.",
        httpStatus: 429,
      })
      .mockResolvedValueOnce(response({ answer: "Back to normal: one row matches." }));
    await renderPage();

    typeQuestion("customers from bucaramanga");
    submit();
    await flush();

    expect(screen.getByText("Too many requests.")).toBeInTheDocument();
    expect(screen.getByText(/Try again in 12 seconds\./)).toBeInTheDocument();
    expect(screen.queryByText(/Something went wrong on our side/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await flush();

    expect(api.semanticSearch).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Back to normal: one row matches.")).toBeInTheDocument();
    expect(screen.queryByText("Too many requests.")).not.toBeInTheDocument();
  });
});
