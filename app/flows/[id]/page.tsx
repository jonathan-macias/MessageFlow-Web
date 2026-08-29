"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getFlow, getDatasetColumns, getFlowExecutions, getFlowExecutionDetail,
  updateFlow, updateFlowMessage, updateFlowFilter,
  activateFlow, pauseFlow, archiveFlow, executeFlow, deleteFlow,
  previewFlowMessage, previewFlowFilter,
} from "@/lib/api";
import { useAuth } from "@/lib/context/auth-context";
import type { FlowDetail, FlowExecution, FlowExecutionDetail, FlowFilter } from "@/lib/types/flow";
import type { DatasetColumn } from "@/lib/types/dataset";
import { FlowStatus, ExecutionType, ExecutionStatus, TriggerSource, FilterOperator } from "@/lib/types/flow";

type Tab = "info" | "message" | "filter" | "executions" | "preview";

export default function FlowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [flow, setFlow] = useState<FlowDetail | null>(null);
  const [columns, setColumns] = useState<DatasetColumn[]>([]);
  const [executions, setExecutions] = useState<FlowExecution[]>([]);
  const [execPage, setExecPage] = useState(1);
  const [execTotalPages, setExecTotalPages] = useState(1);
  const [selectedExecId, setSelectedExecId] = useState<string | null>(null);
  const [execDetail, setExecDetail] = useState<FlowExecutionDetail | null>(null);
  const [isLoadingExecDetail, setIsLoadingExecDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("info");

  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [messageText, setMessageText] = useState("");
  const [filterText, setFilterText] = useState("");

  const [previewRowId, setPreviewRowId] = useState("");
  const [previewSampleValues, setPreviewSampleValues] = useState("");
  const [previewResult, setPreviewResult] = useState<{ renderedMessage: string; missingVariables: string[] } | null>(null);

  const [filterPreviewLimit, setFilterPreviewLimit] = useState(20);
  const [filterPreviewResult, setFilterPreviewResult] = useState<{ matchingRowCount: number; sampleRows: Array<{ id: string; rowNumber: number; values: Record<string, string | null> }> } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadFlow = useCallback(() => {
    if (!id) return Promise.resolve(null);
    return getFlow(id).then((f) => {
      setFlow(f);
      setEditName(f.name);
      setEditDesc(f.description);
      setMessageText(f.messageTemplateText);
      if (f.rootFilter) {
        setFilterText(JSON.stringify(f.rootFilter, null, 2));
      }
      return f;
    });
  }, [id]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;
    let cancelled = false;
    loadFlow()
      .then((f) => {
        if (cancelled || !f) return;
        return getDatasetColumns(f.datasetId);
      })
      .then((cols) => { if (!cancelled && cols) setColumns(cols); })
      .catch((err) => { if (!cancelled) setError(err.detail ?? "Error al cargar flow."); })
      .finally(() => { if (!cancelled) setIsLoadingData(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated, id, loadFlow]);

  useEffect(() => {
    if (!isAuthenticated || !id || activeTab !== "executions") return;
    let cancelled = false;
    getFlowExecutions(id, execPage, 20)
      .then((data) => {
        if (cancelled) return;
        setExecutions(data.items);
        setExecTotalPages(data.totalPages);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAuthenticated, id, activeTab, execPage]);

  useEffect(() => {
    if (!selectedExecId) { setExecDetail(null); return; }
    setIsLoadingExecDetail(true);
    getFlowExecutionDetail(selectedExecId)
      .then(setExecDetail)
      .catch(() => setExecDetail(null))
      .finally(() => setIsLoadingExecDetail(false));
  }, [selectedExecId]);

  if (isLoading || !isAuthenticated) return null;

  function msg(msg: string) {
    setSuccess(msg);
    setError(null);
    setTimeout(() => setSuccess(null), 3000);
  }

  function act(label: string, fn: () => Promise<void>) {
    return async () => {
      setActionLoading(label);
      setError(null);
      try {
        await fn();
        await loadFlow();
        msg(label + " OK");
      } catch (err) {
        const e = err as { detail?: string };
        setError(e.detail ?? `Error al ${label.toLowerCase()}.`);
      } finally {
        setActionLoading(null);
      }
    };
  }

  async function handleSaveInfo() {
    setActionLoading("guardar");
    setError(null);
    try {
      await updateFlow(id, { name: editName, description: editDesc });
      await loadFlow();
      msg("Informacion actualizada");
    } catch (err) {
      const e = err as { detail?: string };
      setError(e.detail ?? "Error al guardar.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveMessage() {
    setActionLoading("mensaje");
    setError(null);
    try {
      await updateFlowMessage(id, { message: messageText });
      await loadFlow();
      msg("Mensaje actualizado");
    } catch (err) {
      const e = err as { detail?: string };
      setError(e.detail ?? "Error al guardar mensaje.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveFilter() {
    setActionLoading("filtro");
    setError(null);
    try {
      let parsed: FlowFilter | null = null;
      if (filterText.trim() && filterText.trim() !== "null") {
        parsed = JSON.parse(filterText) as FlowFilter;
      }
      await updateFlowFilter(id, parsed);
      await loadFlow();
      msg("Filtro actualizado");
    } catch (err) {
      const e = err as { detail?: string };
      setError(e.detail ?? "Error al guardar filtro.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePreviewMessage() {
    setActionLoading("preview-msg");
    setError(null);
    setPreviewResult(null);
    try {
      let sampleValues: Record<string, string> | null = null;
      if (previewSampleValues.trim()) {
        sampleValues = JSON.parse(previewSampleValues) as Record<string, string>;
      }
      const result = await previewFlowMessage(id, {
        datasetRowId: previewRowId || null,
        sampleValues,
        missingVariablePolicy: 3,
      });
      setPreviewResult(result);
    } catch (err) {
      const e = err as { detail?: string };
      setError(e.detail ?? "Error al previsualizar.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePreviewFilter() {
    setActionLoading("preview-filter");
    setError(null);
    setFilterPreviewResult(null);
    try {
      let parsed: FlowFilter | null = null;
      if (filterText.trim() && filterText.trim() !== "null") {
        parsed = JSON.parse(filterText) as FlowFilter;
      }
      const result = await previewFlowFilter(id, {
        filter: parsed,
        sampleLimit: filterPreviewLimit,
      });
      setFilterPreviewResult(result);
    } catch (err) {
      const e = err as { detail?: string };
      setError(e.detail ?? "Error al previsualizar filtro.");
    } finally {
      setActionLoading(null);
    }
  }

  function insertVariable(colName: string, colId: string) {
    setMessageText((prev) => prev + `{{${colId}}}`);
  }

  async function handleDelete() {
    if (!confirm("Eliminar este flow?")) return;
    setActionLoading("eliminar");
    setError(null);
    try {
      await deleteFlow(id);
      router.push("/flows");
    } catch (err) {
      const e = err as { detail?: string };
      setError(e.detail ?? "Error al eliminar.");
    } finally {
      setActionLoading(null);
    }
  }

  if (isLoadingData) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-500">Cargando...</p>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-red-500">Flow no encontrado.</p>
      </div>
    );
  }

  const canActivate = flow.status === 1;
  const canPause = flow.status === 2;
  const canArchive = flow.status === 2 || flow.status === 3 || flow.status === 4;
  const canDelete = flow.status === 1 || flow.status === 5;
  const canExecute = flow.status === 2;

  const tabs: { key: Tab; label: string }[] = [
    { key: "info", label: "Info" },
    { key: "message", label: "Mensaje" },
    { key: "filter", label: "Filtro" },
    { key: "executions", label: "Ejecuciones" },
    { key: "preview", label: "Preview" },
  ];

  return (
    <div className="flex flex-1 bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-4xl mx-auto py-10 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/flows" className="text-sm text-zinc-500 hover:underline">Flows</Link>
          <span className="text-zinc-400">/</span>
          <h1 className="text-2xl font-bold">{flow.name}</h1>
          <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
            flow.status === 2 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : flow.status === 3 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
            : flow.status === 4 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}>
            {FlowStatus[flow.status] ?? flow.status}
          </span>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded p-2">{error}</p>}
        {success && <p className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded p-2">{success}</p>}

        {/* Actions bar */}
        <div className="flex flex-wrap gap-2">
          {canActivate && (
            <button onClick={act("Activar", () => activateFlow(id))} disabled={actionLoading === "Activar"}
              className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
              {actionLoading === "Activar" ? "..." : "Activar"}
            </button>
          )}
          {canPause && (
            <button onClick={act("Pausar", () => pauseFlow(id))} disabled={actionLoading === "Pausar"}
              className="rounded bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600 disabled:opacity-50">
              {actionLoading === "Pausar" ? "..." : "Pausar"}
            </button>
          )}
          {canArchive && (
            <button onClick={act("Archivar", () => archiveFlow(id))} disabled={actionLoading === "Archivar"}
              className="rounded bg-zinc-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-600 disabled:opacity-50">
              {actionLoading === "Archivar" ? "..." : "Archivar"}
            </button>
          )}
          {canExecute && (
            <button onClick={act("Ejecutar", async () => { await executeFlow(id); })} disabled={actionLoading === "Ejecutar"}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {actionLoading === "Ejecutar" ? "..." : "Ejecutar ahora"}
            </button>
          )}
          {canDelete && (
            <button onClick={handleDelete} disabled={actionLoading === "eliminar"}
              className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {actionLoading === "eliminar" ? "..." : "Eliminar"}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-black/10 dark:border-white/10">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === t.key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Info */}
        {activeTab === "info" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3">
                <p className="text-zinc-500">Canal</p>
                <p className="font-medium">{ExecutionType[flow.channel] ?? flow.channel}</p>
              </div>
              <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3">
                <p className="text-zinc-500">Tipo ejecucion</p>
                <p className="font-medium">{ExecutionType[flow.schedule.type] ?? flow.schedule.type}</p>
              </div>
              <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3">
                <p className="text-zinc-500">Zona horaria</p>
                <p className="font-medium">{flow.schedule.timeZone}</p>
              </div>
              <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3">
                <p className="text-zinc-500">Creado</p>
                <p className="font-medium">{new Date(flow.createdAtUtc).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-3">
              <h3 className="text-sm font-semibold">Editar nombre y descripcion</h3>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
              />
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full rounded border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
              />
              <button
                onClick={handleSaveInfo}
                disabled={actionLoading === "guardar"}
                className="rounded bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading === "guardar" ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        )}

        {/* Tab: Message */}
        {activeTab === "message" && (
          <div className="space-y-4">
            {columns.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-2">Insertar variable:</p>
                <div className="flex flex-wrap gap-1.5">
                  {columns.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => insertVariable(col.name, col.id)}
                      className="rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 px-2 py-1 text-xs font-mono transition-colors"
                    >
                      {col.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <textarea
              rows={5}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-zinc-400"
            />
            <button
              onClick={handleSaveMessage}
              disabled={actionLoading === "mensaje"}
              className="rounded bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {actionLoading === "mensaje" ? "Guardando..." : "Guardar mensaje"}
            </button>
          </div>
        )}

        {/* Tab: Filter */}
        {activeTab === "filter" && (
          <div className="space-y-4">
            <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-3">
              <h3 className="text-sm font-semibold">Filtro JSON</h3>
              <p className="text-xs text-zinc-500">
                Operadores: {Object.entries(FilterOperator).map(([k, v]) => `${k}=${v}`).join(", ")}
              </p>
              <textarea
                rows={8}
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder='{"composition":1,"conditions":[...],"groups":null}'
                className="w-full rounded border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-zinc-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveFilter}
                  disabled={actionLoading === "filtro"}
                  className="rounded bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
                >
                  {actionLoading === "filtro" ? "Guardando..." : "Guardar filtro"}
                </button>
                <button
                  onClick={() => { setFilterText(""); }}
                  className="rounded border border-black/10 dark:border-white/10 px-4 py-1.5 text-sm font-medium hover:bg-black/[.04] dark:hover:bg-[#1a1a1a]"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-3">
              <h3 className="text-sm font-semibold">Preview del filtro</h3>
              <div className="flex items-center gap-2">
                <label className="text-sm">Limite de muestras:</label>
                <input
                  type="number"
                  min={1}
                  value={filterPreviewLimit}
                  onChange={(e) => setFilterPreviewLimit(Number(e.target.value))}
                  className="w-20 rounded border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 text-sm outline-none"
                />
                <button
                  onClick={handlePreviewFilter}
                  disabled={actionLoading === "preview-filter"}
                  className="rounded bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
                >
                  {actionLoading === "preview-filter" ? "Cargando..." : "Previsualizar"}
                </button>
              </div>
              {filterPreviewResult && (
                <div className="space-y-2">
                  <p className="text-sm">Filas que coinciden: <strong>{filterPreviewResult.matchingRowCount}</strong></p>
                  {filterPreviewResult.sampleRows.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-zinc-100 dark:bg-zinc-800">
                            <th className="px-2 py-1 text-left">#</th>
                            {Object.keys(filterPreviewResult.sampleRows[0].values).map((k) => (
                              <th key={k} className="px-2 py-1 text-left">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filterPreviewResult.sampleRows.map((r) => (
                            <tr key={r.id} className="border-t border-black/5 dark:border-white/5">
                              <td className="px-2 py-1 text-zinc-500">{r.rowNumber}</td>
                              {Object.entries(r.values).map(([k, v]) => (
                                <td key={k} className="px-2 py-1">{v ?? "—"}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Executions */}
        {activeTab === "executions" && (
          <div className="space-y-4">
            {executions.length === 0 ? (
              <p className="text-zinc-500 text-sm">No hay ejecuciones.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-zinc-100 dark:bg-zinc-800">
                        <th className="px-3 py-2 text-left font-medium">Estado</th>
                        <th className="px-3 py-2 text-left font-medium">Origen</th>
                        <th className="px-3 py-2 text-left font-medium">Inicio</th>
                        <th className="px-3 py-2 text-left font-medium">Fin</th>
                        <th className="px-3 py-2 text-left font-medium">Registros</th>
                        <th className="px-3 py-2 text-left font-medium">Exitosos</th>
                        <th className="px-3 py-2 text-left font-medium">Fallidos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {executions.map((ex) => (
                        <tr
                          key={ex.id}
                          onClick={() => setSelectedExecId(selectedExecId === ex.id ? null : ex.id)}
                          className={`border-t border-black/5 dark:border-white/5 cursor-pointer transition-colors ${
                            selectedExecId === ex.id
                              ? "bg-zinc-100 dark:bg-zinc-800"
                              : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                          }`}
                        >
                          <td className="px-3 py-2">
                            <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                              ex.status === 3 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : ex.status === 2 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : ex.status === 1 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : ex.status === 5 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            }`}>
                              {ExecutionStatus[ex.status] ?? `Status ${ex.status}`}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs">{TriggerSource[ex.triggerSource] ?? ex.triggerSource}</td>
                          <td className="px-3 py-2 text-xs">{new Date(ex.startedAtUtc).toLocaleString()}</td>
                          <td className="px-3 py-2 text-xs">{ex.completedAtUtc ? new Date(ex.completedAtUtc).toLocaleString() : "—"}</td>
                          <td className="px-3 py-2">{ex.processedRecords}/{ex.totalRecords}</td>
                          <td className="px-3 py-2 text-green-600">{ex.successfulRecords}</td>
                          <td className="px-3 py-2 text-red-600">{ex.failedRecords}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedExecId && (
                  <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Detalle de ejecucion</h3>
                      <button onClick={() => setSelectedExecId(null)} className="text-xs text-zinc-500 hover:underline">Cerrar</button>
                    </div>
                    {isLoadingExecDetail ? (
                      <p className="text-sm text-zinc-500">Cargando...</p>
                    ) : execDetail ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <p className="text-zinc-500">ID</p>
                            <p className="font-mono break-all">{execDetail.id}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500">Idempotency Key</p>
                            <p className="font-mono break-all">{execDetail.idempotencyKey}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500">Tipo</p>
                            <p>{ExecutionType[execDetail.executionType] ?? execDetail.executionType}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500">Estado</p>
                            <p>{ExecutionStatus[execDetail.status] ?? execDetail.status}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500">Origen</p>
                            <p>{TriggerSource[execDetail.triggerSource] ?? execDetail.triggerSource}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500">Inicio</p>
                            <p>{new Date(execDetail.startedAtUtc).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500">Fin</p>
                            <p>{execDetail.completedAtUtc ? new Date(execDetail.completedAtUtc).toLocaleString() : "—"}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500">Registros</p>
                            <p>{execDetail.processedRecords}/{execDetail.totalRecords} ({execDetail.successfulRecords} ok, {execDetail.failedRecords} fallo)</p>
                          </div>
                        </div>
                        {execDetail.errorMessage && (
                          <div className="rounded bg-red-50 dark:bg-red-900/20 p-2">
                            <p className="text-xs font-medium text-red-600">Error:</p>
                            <p className="text-xs text-red-600 font-mono">{execDetail.errorMessage}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-red-500">No se pudo cargar el detalle.</p>
                    )}
                  </div>
                )}

                {execTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => setExecPage((p) => Math.max(1, p - 1))} disabled={execPage === 1}
                      className="rounded border border-black/10 dark:border-white/10 px-3 py-1 text-sm disabled:opacity-50">Anterior</button>
                    <span className="text-sm text-zinc-500">Pagina {execPage} de {execTotalPages}</span>
                    <button onClick={() => setExecPage((p) => Math.min(execTotalPages, p + 1))} disabled={execPage === execTotalPages}
                      className="rounded border border-black/10 dark:border-white/10 px-3 py-1 text-sm disabled:opacity-50">Siguiente</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab: Preview */}
        {activeTab === "preview" && (
          <div className="space-y-4">
            <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-3">
              <h3 className="text-sm font-semibold">Preview de mensaje</h3>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Dataset Row ID (opcional)</label>
                <input
                  type="text"
                  value={previewRowId}
                  onChange={(e) => setPreviewRowId(e.target.value)}
                  placeholder="UUID de una fila del dataset"
                  className="w-full rounded border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-zinc-400"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Valores de ejemplo (JSON)</label>
                <textarea
                  rows={3}
                  value={previewSampleValues}
                  onChange={(e) => setPreviewSampleValues(e.target.value)}
                  placeholder='{"Nombre": "Carlos", "Correo": "carlos@test.com"}'
                  className="w-full rounded border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-zinc-400"
                />
              </div>
              <button
                onClick={handlePreviewMessage}
                disabled={actionLoading === "preview-msg"}
                className="rounded bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading === "preview-msg" ? "Cargando..." : "Previsualizar"}
              </button>

              {previewResult && (
                <div className="rounded bg-zinc-50 dark:bg-zinc-800 p-3 space-y-2">
                  <p className="text-sm font-mono whitespace-pre-wrap">{previewResult.renderedMessage}</p>
                  {previewResult.missingVariables.length > 0 && (
                    <p className="text-xs text-yellow-600">
                      Variables faltantes: {previewResult.missingVariables.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
