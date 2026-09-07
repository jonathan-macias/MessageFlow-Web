"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { queryDataset, getDataset } from "@/lib/api";
import { useAuth } from "@/lib/context/auth-context";
import { Breadcrumbs } from "@/components/breadcrumbs";
import type { DatasetQueryResponse } from "@/lib/types/ai";

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
  const inputRef = useRef<HTMLInputElement>(null);

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
            ? { ...m, error: e.detail ?? "Error al consultar el dataset." }
            : m,
        ),
      );
    } finally {
      setIsQuerying(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-1 bg-zinc-50 dark:bg-black flex-col">
      <div className="w-full max-w-3xl mx-auto py-6 px-4 flex flex-col flex-1 min-h-0">
        <Breadcrumbs items={[
          { label: "Datasets", href: "/datasets" },
          { label: datasetName || "...", href: `/datasets/${id}` },
          { label: "Consultar" },
        ]} />

        <h1 className="text-2xl font-bold mb-1">Consultar dataset</h1>
        <p className="text-sm text-zinc-500 mb-4">
          Haz preguntas en lenguaje natural sobre los datos de <strong>{datasetName}</strong>.
        </p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded p-2 mb-4">{error}</p>
        )}

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-zinc-400 space-y-3">
              <div className="text-4xl"> </div>
              <p className="text-sm">Pregunta lo que quieras sobre tu dataset</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {[
                  "Cuantos registros tengo?",
                  "Cuantos por ciudad?",
                  "Cual es el total de compras?",
                  "Muestrame los 10 con mas compras",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => { setQuestion(suggestion); inputRef.current?.focus(); }}
                    className="text-xs rounded-full border border-black/10 dark:border-white/10 px-3 py-1.5 hover:bg-black/[.04] dark:hover:bg-white/[.06] transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="space-y-3">
              {/* User question */}
              <div className="flex justify-end">
                <div className="bg-foreground text-background rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%] text-sm">
                  {msg.question}
                </div>
              </div>

              {/* AI response */}
              <div className="flex justify-start">
                <div className="bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%] text-sm space-y-2">
                  {msg.error ? (
                    <p className="text-red-600">{msg.error}</p>
                  ) : msg.response ? (
                    <>
                      <p className="whitespace-pre-wrap">{msg.response.answer}</p>

                      {/* Structured query info */}
                      <details className="text-xs text-zinc-500">
                        <summary className="cursor-pointer hover:text-foreground transition-colors">
                          Ver consulta generada
                        </summary>
                        <div className="mt-2 space-y-1 font-mono">
                          <p>Accion: {msg.response.query.action}</p>
                          {msg.response.query.targetColumn && (
                            <p>Columna: {msg.response.query.targetColumn}</p>
                          )}
                          {msg.response.query.groupByColumn && (
                            <p>Agrupar por: {msg.response.query.groupByColumn}</p>
                          )}
                          {msg.response.query.limit && (
                            <p>Limite: {msg.response.query.limit}</p>
                          )}
                          {msg.response.query.filters.length > 0 && (
                            <div>
                              <p>Filtros:</p>
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
                        <div className="overflow-x-auto mt-2">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-zinc-100 dark:bg-zinc-800">
                                {Object.keys(msg.response.rows[0]).map((key) => (
                                  <th key={key} className="px-2 py-1 text-left font-medium">
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {msg.response.rows.map((row, i) => (
                                <tr key={i} className="border-t border-black/5 dark:border-white/5">
                                  {Object.entries(row).map(([key, val]) => (
                                    <td key={key} className="px-2 py-1">
                                      {val ?? "—"}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-zinc-500">
                      <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                      Procesando...
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
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ej: Cuantos clientes tengo de Bucaramanga?"
            maxLength={2000}
            disabled={isQuerying}
            className="flex-1 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isQuerying || !question.trim()}
            className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {isQuerying ? (
              <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
            ) : (
              "Preguntar"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
