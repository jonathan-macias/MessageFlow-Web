"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getDataset, getDatasetColumns } from "@/lib/api";
import { useAuth } from "@/lib/context/auth-context";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FilterBuilder } from "@/components/semantic-search/filter-builder";
import { ResultPanel } from "@/components/semantic-search/result-panel";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/field";
import { IconAlertTriangle, IconSearch } from "@/components/ui/icons";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
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

const TEXT_LINK =
  "inline-block text-xs text-accent underline underline-offset-4 hover:text-accent-hover transition-colors";

const NOTICE_TONES = {
  info: "border-info-line bg-info-bg text-info-fg",
  warning: "border-warn-line bg-warn-bg text-warn-fg",
} as const;

/**
 * Aviso con la apariencia de <Alert> pero anunciado de forma cortés (aria-live="polite"): estados
 * informativos o recuperables que no deben interrumpir al lector de pantalla como un role="alert".
 */
function LiveNotice({
  tone,
  icon,
  action,
  children,
}: {
  tone: keyof typeof NOTICE_TONES;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-live="polite"
      className={cn("flex items-start gap-2.5 rounded-xl border p-4 text-sm", NOTICE_TONES[tone])}
    >
      {icon}
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  );
}

type LoadState ="loading" | "ready" | "not-found" | "error";

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
    <PageShell width="4xl" className="py-6 space-y-6">
      <Breadcrumbs
        items={[
          { label: "Datasets", href: "/datasets" },
          { label: datasetName || "...", href: `/datasets/${id}` },
          { label: "Semantic search" },
        ]}
      />

      <PageHeader
        title="Semantic search"
        description={
          <>
            Find the rows of{" "}
            <strong className="font-semibold text-fg">
              {notFound || loadState === "loading" ? "this dataset" : datasetName}
            </strong>{" "}
            that are closest in meaning to your question.
          </>
        }
      />

      {notFound && (
        <Card className="space-y-2">
          <p className="text-sm font-medium text-fg">We could not find this dataset.</p>
          <p className="text-xs text-muted">It may no longer exist, or the link may be incorrect.</p>
          <Link href="/datasets" className={TEXT_LINK}>
            Back to my datasets
          </Link>
        </Card>
      )}

      {loadState === "error" && (
        <Card className="space-y-2">
          <p className="text-sm font-medium text-fg">We could not load this dataset.</p>
          <p className="text-xs text-muted">Check your connection and try again.</p>
        </Card>
      )}

      {unavailable && (
        <Card className="space-y-2">
          <p className="text-sm font-medium text-fg">Semantic search is not available.</p>
          <p className="text-xs text-muted">
            {problem.detail || "This feature is currently disabled on the server."} In the
            meantime you can use the{" "}
            <Link href={`/datasets/${id}/query`} className={TEXT_LINK}>
              structured query
            </Link>
            , which answers aggregation, count and filter questions.
          </p>
        </Card>
      )}

      {canSearchSemantically && !unavailable && (
        <>
          <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-surface p-4 space-y-4">
            <div>
              <Field label="What are you looking for?" error={fieldErrors.question}>
                <Textarea
                  id="semantic-question"
                  value={question}
                  onChange={(event) => handleQuestionChange(event.target.value)}
                  maxLength={MAX_QUESTION_LENGTH}
                  rows={3}
                  disabled={isSearching}
                  placeholder="e.g. customers interested in premium plans who live in Bucaramanga"
                  aria-describedby="semantic-question-hint"
                />
              </Field>
              <p id="semantic-question-hint" className="mt-1 text-xs text-subtle">
                {question.trim().length}/{MAX_QUESTION_LENGTH} characters.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <Field label="Maximum rows" labelSize="sm">
                <Select
                  value={topK}
                  onChange={(event) => handleTopKChange(Number(event.target.value))}
                  disabled={isSearching}
                >
                  {TOP_K_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>
              {readyFromCache && (
                <span className="pb-2 text-xs text-subtle">
                  This dataset is ready for semantic search.
                </span>
              )}
            </div>
            {fieldErrors.topK && <p className="text-xs text-bad-fg">{fieldErrors.topK}</p>}

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
                  <li key={message} className="text-xs text-bad-fg">
                    {message}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={isSearching}>
                {!isSearching && <IconSearch className="size-4" />}
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>
          </form>

          {indexing && (
            <LiveNotice
              tone="info"
              icon={<Spinner className="mt-0.5 size-4 shrink-0" />}
              action={
                <Button size="sm" variant="secondary" onClick={retryRequest}>
                  Retry now
                </Button>
              }
            >
              <p className="font-medium">Preparing this dataset for semantic search</p>
              <p className="mt-1 text-xs opacity-90">
                {indexing.status
                  ? INDEXING_COPY[indexing.status]
                  : "Indexing starts with the first search."}{" "}
                It can take a few minutes depending on its size. Your question is still valid: the
                search will repeat on its own as soon as the dataset is ready.
              </p>
              <p className="mt-1 text-xs opacity-75">
                {exhausted
                  ? "We are still waiting for the server. You can retry whenever you like."
                  : `Automatic retry every ${POLL_INTERVAL_MS / 1000} s (attempt ${indexing.attempt} of ${MAX_POLL_ATTEMPTS}).`}
              </p>
            </LiveNotice>
          )}

          {justBecameReady && result && <Alert tone="success" title="Semantic search is ready." />}

          {problem?.kind === "validation" && (
            <LiveNotice tone="warning" icon={<IconAlertTriangle className="mt-0.5 size-4 shrink-0" />}>
              <p className="font-medium">Check the highlighted fields.</p>
              {problem.detail && <p className="mt-0.5 text-xs opacity-90">{problem.detail}</p>}
            </LiveNotice>
          )}

          {problem?.kind === "business-rule" && (
            <Card className="space-y-2">
              <p className="text-sm font-medium text-fg">We could not run this search.</p>
              <p className="text-xs text-muted">{problem.detail}</p>
              {canSearchSemantically && (
                <Link href={`/datasets/${id}/query`} className={TEXT_LINK}>
                  Try the structured query instead
                </Link>
              )}
            </Card>
          )}

          {problem?.kind === "rate-limited" && (
            <Alert
              tone="warning"
              title="Too many requests."
              action={
                <Button size="sm" variant="secondary" onClick={retryRequest}>
                  Retry
                </Button>
              }
            >
              <p className="text-xs">{problem.detail}</p>
            </Alert>
          )}

          {problem?.kind === "server-error" && (
            <Alert
              tone="error"
              title="Something went wrong on our side."
              action={
                <Button size="sm" variant="secondary" onClick={retryRequest}>
                  Retry
                </Button>
              }
            >
              <p className="text-xs">
                {problem.detail || "We could not complete the search. Please try again."}
              </p>
            </Alert>
          )}

          {problem?.kind === "not-found" && (
            <Card className="space-y-2">
              <p className="text-sm font-medium text-fg">We could not find this dataset.</p>
              <Link href="/datasets" className={TEXT_LINK}>
                Back to my datasets
              </Link>
            </Card>
          )}

          {problem?.kind === "unauthorized" && (
            <Card className="space-y-2">
              <p className="text-sm font-medium text-fg">Your session has expired.</p>
              <Link href="/login" className={TEXT_LINK}>
                Sign in again
              </Link>
            </Card>
          )}

          {result && <ResultPanel response={result} columns={columns} />}
        </>
      )}

      {loadState === "ready" && !canSearchSemantically && !unavailable && (
        <Card className="space-y-2">
          <p className="text-sm font-medium text-fg">
            This dataset has no text columns, so it does not support semantic search.
          </p>
          <p className="text-xs text-muted">
            Semantic search needs text to compare meaning. For this dataset, the{" "}
            <Link href={`/datasets/${id}/query`} className={TEXT_LINK}>
              structured query
            </Link>{" "}
            is a better fit: it answers aggregation, count and filter questions.
          </p>
        </Card>
      )}
    </PageShell>
  );
}
