"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getDataset, getDatasetColumns } from "@/lib/api";
import { useAuth } from "@/lib/context/auth-context";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FilterBuilder } from "@/components/semantic-search/filter-builder";
import { ResultPanel } from "@/components/semantic-search/result-panel";
import { hasTextColumns } from "@/lib/semantic-search/columns";
import {
  DEFAULT_TOP_K,
  MAX_QUESTION_LENGTH,
  buildFilters,
  buildSearchRequest,
  validateQuestion,
  validateTopK,
  type FilterDraft,
} from "@/lib/semantic-search/filters";
import { isDatasetReady, markDatasetReady } from "@/lib/semantic-search/ready-cache";
import { runSemanticSearch, type SemanticSearchOutcome } from "@/lib/semantic-search/outcome";
import type { SemanticSearchResponse, SemanticIndexingStatus } from "@/lib/types/ai";
import type { DatasetColumn } from "@/lib/types/dataset";

const POLL_INTERVAL_MS = 25_000;
const MAX_POLL_ATTEMPTS = 20;
const TOP_K_OPTIONS = [5, 10, 20, 50];

const INDEXING_COPY: Record<SemanticIndexingStatus, string> = {
  Pending: "This dataset is queued for indexing.",
  Indexing: "This dataset is being indexed right now.",
  Failed: "The previous indexing run did not finish. It will be retried the next time you search.",
};

type LoadState = "loading" | "ready" | "not-found" | "error";

interface IndexingState {
  attempt: number;
  status: SemanticIndexingStatus | null;
}

interface FieldErrors {
  question: string | null;
  topK: string | null;
  filters: Record<string, string>;
  others: string[];
}

const EMPTY_FIELD_ERRORS: FieldErrors = { question: null, topK: null, filters: {}, others: [] };

function mergeServerFieldErrors(
  fieldErrors: Record<string, string[]>,
  drafts: FilterDraft[],
): FieldErrors {
  const result: FieldErrors = { question: null, topK: null, filters: {}, others: [] };
  const known = new Set(["question", "topK", "filters"]);

  for (const [field, messages] of Object.entries(fieldErrors)) {
    const message = messages[0] ?? "Invalid value.";

    if (field.toLowerCase() === "question") {
      result.question = message;
      continue;
    }
    if (field.toLowerCase() === "topk") {
      result.topK = message;
      continue;
    }

    const match = /^filters\[(\d+)\]/i.exec(field);
    if (match) {
      const draft = drafts[Number(match[1])];
      if (draft) result.filters[draft.id] = message;
      else result.others.push(message);
      continue;
    }
    if (field.toLowerCase() === "filters") {
      const target = drafts[0];
      if (target) result.filters[target.id] = message;
      else result.others.push(message);
      continue;
    }
    if (!known.has(field)) result.others.push(message);
  }

  return result;
}

export default function SemanticSearchPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [datasetName, setDatasetName] = useState("");
  const [columns, setColumns] = useState<DatasetColumn[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [readyFromCache, setReadyFromCache] = useState(false);

  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(DEFAULT_TOP_K);
  const [drafts, setDrafts] = useState<FilterDraft[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(EMPTY_FIELD_ERRORS);

  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SemanticSearchResponse | null>(null);
  const [indexing, setIndexing] = useState<IndexingState | null>(null);
  const [problem, setProblem] = useState<SemanticSearchOutcome | null>(null);
  const [justBecameReady, setJustBecameReady] = useState(false);

  const draftsRef = useRef<FilterDraft[]>(drafts);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runIdRef = useRef(0);
  const wasIndexingRef = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;
    let cancelled = false;

    (async () => {
      try {
        const [dataset, datasetColumns] = await Promise.all([
          getDataset(id),
          getDatasetColumns(id),
        ]);
        if (cancelled) return;
        setDatasetName(dataset.name);
        setColumns(datasetColumns);
        setReadyFromCache(isDatasetReady(id));
        setLoadState("ready");
      } catch (error) {
        if (cancelled) return;
        const status = (error as { httpStatus?: number }).httpStatus;
        setLoadState(status === 404 ? "not-found" : "error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, id]);

  // Salir de la página cancela el reintento automático: no debe seguir consultando.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      runIdRef.current += 1;
    };
  }, []);

  function cancelSearch() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    runIdRef.current += 1;
    setIsSearching(false);
  }

  function resetOutcome() {
    setResult(null);
    setIndexing(null);
    setProblem(null);
    setJustBecameReady(false);
    wasIndexingRef.current = false;
  }

  function updateDrafts(next: FilterDraft[]) {
    draftsRef.current = next;
    setDrafts(next);
  }

  function handleQuestionChange(value: string) {
    setQuestion(value);
    cancelSearch();
    resetOutcome();
  }

  function handleTopKChange(value: number) {
    setTopK(value);
    cancelSearch();
    resetOutcome();
  }

  function handleDraftsChange(next: FilterDraft[]) {
    updateDrafts(next);
    cancelSearch();
    resetOutcome();
  }

  async function execute(
    request: ReturnType<typeof buildSearchRequest>,
    attempt: number,
  ) {
    const runId = ++runIdRef.current;
    setIsSearching(true);

    const outcome = await runSemanticSearch(request);

    if (runId !== runIdRef.current) return;
    setIsSearching(false);

    if (outcome.kind === "success") {
      setIndexing(null);
      setProblem(null);
      setResult(outcome.response);
      markDatasetReady(request.datasetId);
      if (wasIndexingRef.current) {
        setReadyFromCache(true);
        setJustBecameReady(true);
      }
      wasIndexingRef.current = false;
      return;
    }

    if (outcome.kind === "indexing") {
      setResult(null);
      setProblem(null);
      setIndexing({ attempt, status: outcome.indexingStatus });
      wasIndexingRef.current = true;

      if (attempt < MAX_POLL_ATTEMPTS) {
        const currentRunId = runId;
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          if (currentRunId !== runIdRef.current) return;
          void execute(request, attempt + 1);
        }, POLL_INTERVAL_MS);
      }
      return;
    }

    if (outcome.kind === "validation") {
      setIndexing(null);
      setResult(null);
      setFieldErrors((prev) => ({ ...prev, ...mergeServerFieldErrors(outcome.fieldErrors, draftsRef.current) }));
      setProblem(outcome);
      return;
    }

    setIndexing(null);
    setResult(null);
    setProblem(outcome);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isSearching || !id || loadState !== "ready") return;

    const questionError = validateQuestion(question);
    const topKError = validateTopK(topK);
    const { errors: filterErrors } = buildFilters(drafts, columns);

    setFieldErrors({
      question: questionError,
      topK: topKError,
      filters: filterErrors,
      others: [],
    });

    if (questionError || topKError || Object.keys(filterErrors).length > 0) return;

    cancelSearch();
    resetOutcome();
    void execute(buildSearchRequest(id, question, topK, drafts, columns), 1);
  }

  if (isLoading || !isAuthenticated) return null;

  const notFound = loadState === "not-found";
  const unavailable = problem?.kind === "unavailable";
  const canSearchSemantically = loadState === "ready" && hasTextColumns(columns);
  const exhausted = indexing !== null && indexing.attempt >= MAX_POLL_ATTEMPTS;
  const retryRequest = () => {
    if (!id) return;
    cancelSearch();
    resetOutcome();
    void execute(buildSearchRequest(id, question, topK, drafts, columns), 1);
  };

  return (
    <div className="flex flex-1 bg-zinc-50 dark:bg-black flex-col">
      <div className="w-full max-w-4xl mx-auto py-6 px-4 space-y-6">
        <Breadcrumbs
          items={[
            { label: "Datasets", href: "/datasets" },
            { label: datasetName || "...", href: `/datasets/${id}` },
            { label: "Semantic search" },
          ]}
        />

        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Semantic search</h1>
          <p className="text-sm text-zinc-500">
            Find the rows of{" "}
            <strong>{notFound || loadState === "loading" ? "this dataset" : datasetName}</strong> that
            are closest in meaning to your question.
          </p>
        </div>

        {notFound && (
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-2">
            <p className="text-sm font-medium">We could not find this dataset.</p>
            <p className="text-xs text-zinc-500">
              It may no longer exist, or the link may be incorrect.
            </p>
            <Link
              href="/datasets"
              className="inline-block text-xs underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Back to my datasets
            </Link>
          </div>
        )}

        {loadState === "error" && (
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-2">
            <p className="text-sm font-medium">We could not load this dataset.</p>
            <p className="text-xs text-zinc-500">Check your connection and try again.</p>
          </div>
        )}

        {unavailable && (
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-2">
            <p className="text-sm font-medium">Semantic search is not available.</p>
            <p className="text-xs text-zinc-500">
              {problem.detail || "This feature is currently disabled on the server."} In the
              meantime you can use the{" "}
              <Link
                href={`/datasets/${id}/query`}
                className="underline underline-offset-4 hover:text-foreground transition-colors"
              >
                structured query
              </Link>
              , which answers aggregation, count and filter questions.
            </p>
          </div>
        )}

        {canSearchSemantically && !unavailable && (
          <>
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-4"
            >
              <div className="space-y-1">
                <label htmlFor="semantic-question" className="text-sm font-medium block">
                  What are you looking for?
                </label>
                <textarea
                  id="semantic-question"
                  value={question}
                  onChange={(event) => handleQuestionChange(event.target.value)}
                  maxLength={MAX_QUESTION_LENGTH}
                  rows={3}
                  disabled={isSearching}
                  placeholder="e.g. customers interested in premium plans who live in Bucaramanga"
                  aria-describedby="semantic-question-hint"
                  className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-50"
                />
                <p id="semantic-question-hint" className="text-xs text-zinc-500">
                  {question.trim().length}/{MAX_QUESTION_LENGTH} characters.
                </p>
                {fieldErrors.question && (
                  <p className="text-xs text-red-600">{fieldErrors.question}</p>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <label className="text-xs space-y-1">
                  <span className="text-zinc-500 block">Maximum rows</span>
                  <select
                    value={topK}
                    onChange={(event) => handleTopKChange(Number(event.target.value))}
                    disabled={isSearching}
                    className="rounded-lg border border-black/10 dark:border-white/10 bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-50"
                  >
                    {TOP_K_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                {readyFromCache && (
                  <span className="text-xs text-zinc-500">
                    This dataset is ready for semantic search.
                  </span>
                )}
              </div>
              {fieldErrors.topK && <p className="text-xs text-red-600">{fieldErrors.topK}</p>}

              <FilterBuilder
                columns={columns}
                drafts={drafts}
                errors={fieldErrors.filters}
                disabled={isSearching}
                onChange={handleDraftsChange}
              />

              {fieldErrors.others.length > 0 && (
                <ul className="space-y-1">
                  {fieldErrors.others.map((message) => (
                    <li key={message} className="text-xs text-red-600">
                      {message}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={isSearching}
                  className="rounded-full bg-foreground text-background px-5 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isSearching ? "Searching..." : "Search"}
                </button>
              </div>
            </form>

            {indexing && (
              <section
                aria-live="polite"
                className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-2"
              >
                <p className="text-sm font-medium">Preparing this dataset for semantic search</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  {indexing.status
                    ? INDEXING_COPY[indexing.status]
                    : "Indexing starts with the first search."}{" "}
                  It can take a few minutes depending on its size. Your question is still valid: the
                  search will repeat on its own as soon as the dataset is ready.
                </p>
                <p className="text-xs text-zinc-500">
                  {exhausted
                    ? "We are still waiting for the server. You can retry whenever you like."
                    : `Automatic retry every ${POLL_INTERVAL_MS / 1000} s (attempt ${indexing.attempt} of ${MAX_POLL_ATTEMPTS}).`}
                </p>
                <button
                  type="button"
                  onClick={retryRequest}
                  className="rounded-full border border-blue-300 dark:border-blue-800 px-4 py-1.5 text-xs hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                >
                  Retry now
                </button>
              </section>
            )}

            {justBecameReady && result && (
              <p
                aria-live="polite"
                className="text-xs text-emerald-700 dark:text-emerald-400"
              >
                Semantic search is ready.
              </p>
            )}

            {problem?.kind === "validation" && (
              <section
                aria-live="polite"
                className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-1"
              >
                <p className="text-sm font-medium">Check the highlighted fields.</p>
                {problem.detail && <p className="text-xs text-zinc-600 dark:text-zinc-300">{problem.detail}</p>}
              </section>
            )}

            {problem?.kind === "business-rule" && (
              <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-2">
                <p className="text-sm font-medium">We could not run this search.</p>
                <p className="text-xs text-zinc-500">{problem.detail}</p>
                {canSearchSemantically && (
                  <Link
                    href={`/datasets/${id}/query`}
                    className="inline-block text-xs underline underline-offset-4 hover:text-foreground transition-colors"
                  >
                    Try the structured query instead
                  </Link>
                )}
              </section>
            )}

            {problem?.kind === "rate-limited" && (
              <section
                role="alert"
                className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2"
              >
                <p className="text-sm font-medium">Too many requests.</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">{problem.detail}</p>
                <button
                  type="button"
                  onClick={retryRequest}
                  className="rounded-full border border-amber-300 dark:border-amber-800 px-4 py-1.5 text-xs hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                >
                  Retry
                </button>
              </section>
            )}

            {problem?.kind === "server-error" && (
              <section className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-4 space-y-2">
                <p className="text-sm font-medium">Something went wrong on our side.</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  {problem.detail || "We could not complete the search. Please try again."}
                </p>
                <button
                  type="button"
                  onClick={retryRequest}
                  className="rounded-full border border-red-300 dark:border-red-800 px-4 py-1.5 text-xs hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                  Retry
                </button>
              </section>
            )}

            {problem?.kind === "not-found" && (
              <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-2">
                <p className="text-sm font-medium">We could not find this dataset.</p>
                <Link
                  href="/datasets"
                  className="inline-block text-xs underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  Back to my datasets
                </Link>
              </section>
            )}

            {problem?.kind === "unauthorized" && (
              <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-2">
                <p className="text-sm font-medium">Your session has expired.</p>
                <Link
                  href="/login"
                  className="inline-block text-xs underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  Sign in again
                </Link>
              </section>
            )}

            {result && <ResultPanel response={result} columns={columns} />}
          </>
        )}

        {loadState === "ready" && !canSearchSemantically && !unavailable && (
          <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-2">
            <p className="text-sm font-medium">
              This dataset has no text columns, so it does not support semantic search.
            </p>
            <p className="text-xs text-zinc-500">
              Semantic search needs text to compare meaning. For this dataset, the{" "}
              <Link
                href={`/datasets/${id}/query`}
                className="underline underline-offset-4 hover:text-foreground transition-colors"
              >
                structured query
              </Link>
              {" "}is a better fit: it answers aggregation, count and filter questions.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
