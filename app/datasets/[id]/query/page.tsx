"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { queryDataset, getDataset } from "@/lib/api";
import { useAuth } from "@/lib/context/auth-context";
import { Breadcrumbs } from "@/components/breadcrumbs";
import type { DatasetQueryResponse } from "@/lib/types/ai";
import { PageShell } from "@/components/ui/page-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { IconSparkles } from "@/components/ui/icons";

const QUESTION_INPUT_ID = "dataset-question";

// Input (components/ui) no reenvía refs, así que se enfoca por id.
function focusQuestionInput() {
  document.getElementById(QUESTION_INPUT_ID)?.focus();
}

interface ChatMessage {
  id: string;
  question: string;
  response: DatasetQueryResponse | null;
  error: string | null;
  timestamp: Date;
}

export default function DatasetQueryPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [datasetName, setDatasetName] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;
    getDataset(id).then((ds) => setDatasetName(ds.name)).catch(() => {});
  }, [isAuthenticated, id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading || !isAuthenticated) return null;

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || isQuerying) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      question: q,
      response: null,
      error: null,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setIsQuerying(true);
    setError(null);

    try {
      const result = await queryDataset({ datasetId: id, question: q });
      setMessages((prev) =>
        prev.map((m) => (m.id === userMessage.id ? { ...m, response: result } : m)),
      );
    } catch (err) {
      const e = err as { detail?: string };
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMessage.id
            ? { ...m, error: e.detail ?? "Failed to query the dataset." }
            : m,
        ),
      );
    } finally {
      setIsQuerying(false);
      focusQuestionInput();
    }
  }

  return (
    <PageShell width="3xl" fill className="py-6">
      <Breadcrumbs items={[
        { label: "Datasets", href: "/datasets" },
        { label: datasetName || "...", href: `/datasets/${id}` },
        { label: "Query" },
      ]} />

      <h1 className="text-2xl font-semibold tracking-tight text-fg mb-1">Query dataset</h1>
      <p className="text-sm text-muted mb-4">
        Ask questions in natural language about the data in <strong className="font-medium text-fg">{datasetName}</strong>.
      </p>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={<IconSparkles className="size-5" aria-hidden="true" />}
              title="Ask anything about your dataset"
              className="border-0"
              action={
                <div className="flex max-w-md flex-wrap justify-center gap-2">
                  {[
                    "How many records do I have?",
                    "How many per city?",
                    "What is the total of purchases?",
                    "Show me the top 10 by purchases",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => { setQuestion(suggestion); focusQuestionInput(); }}
                      className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-fg transition-colors hover:border-line-strong hover:bg-raised"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              }
            />
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="space-y-3">
            {/* User question */}
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-on-accent">
                {msg.question}
              </div>
            </div>

            {/* AI response */}
            <div className="flex justify-start">
              <div className="max-w-[85%] space-y-2 rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3 text-sm text-fg">
                {msg.error ? (
                  <p role="alert" className="text-bad-fg">{msg.error}</p>
                ) : msg.response ? (
                  <>
                    <p className="whitespace-pre-wrap">{msg.response.answer}</p>

                    {/* Structured query info */}
                    <details className="rounded-lg border border-line bg-field px-3 py-2 text-xs text-muted">
                      <summary className="cursor-pointer transition-colors hover:text-fg">
                        View generated query
                      </summary>
                      <div className="mt-2 space-y-1 font-mono text-fg">
                        <p>Action: {msg.response.query.action}</p>
                        {msg.response.query.targetColumn && (
                          <p>Column: {msg.response.query.targetColumn}</p>
                        )}
                        {msg.response.query.groupByColumn && (
                          <p>Group by: {msg.response.query.groupByColumn}</p>
                        )}
                        {msg.response.query.limit && (
                          <p>Limit: {msg.response.query.limit}</p>
                        )}
                        {msg.response.query.filters.length > 0 && (
                          <div>
                            <p>Filters:</p>
                            {msg.response.query.filters.map((f, i) => (
                              <p key={i} className="ml-2">
                                {f.column} {f.operator} {f.value}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>

                    {/* Rows data */}
                    {msg.response.rows && msg.response.rows.length > 0 && (
                      <div className="mt-2">
                        <Table className="text-xs">
                          <THead>
                            <tr>
                              {Object.keys(msg.response.rows[0]).map((key) => (
                                <Th key={key} className="px-2 py-1">
                                  {key}
                                </Th>
                              ))}
                            </tr>
                          </THead>
                          <tbody>
                            {msg.response.rows.map((row, i) => (
                              <Tr key={i}>
                                {Object.entries(row).map(([key, val]) => (
                                  <Td key={key} className="px-2 py-1">
                                    {val ?? "—"}
                                  </Td>
                                ))}
                              </Tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    )}
                  </>
                ) : (
                  <div role="status" aria-busy="true" className="flex items-center gap-2 text-muted">
                    <Spinner />
                    Processing...
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleQuery} className="flex gap-2">
        <label htmlFor={QUESTION_INPUT_ID} className="sr-only">
          Question
        </label>
        <Input
          id={QUESTION_INPUT_ID}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. How many customers do I have in Bucaramanga?"
          maxLength={2000}
          disabled={isQuerying}
          className="flex-1 w-auto"
        />
        <Button type="submit" loading={isQuerying} disabled={!question.trim()}>
          Ask
        </Button>
      </form>
    </PageShell>
  );
}
