"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getFlow, getDatasetColumns, getFlowExecutions, getFlowExecutionDetail,
  updateFlow, updateFlowMessage, updateFlowFilter,
  activateFlow, pauseFlow, archiveFlow, executeFlow, deleteFlow,
  previewFlowMessage, previewFlowFilter, generateMessage,
} from "@/lib/api";
import { useAuth } from "@/lib/context/auth-context";
import type { FlowDetail, FlowExecution, FlowExecutionDetail, FlowFilter, ScheduleRequest } from "@/lib/types/flow";
import type { DatasetColumn } from "@/lib/types/dataset";
import { FlowStatus, ExecutionType, ExecutionStatus, ChannelType, TriggerSource, FilterOperator } from "@/lib/types/flow";
import { Breadcrumbs } from "@/components/breadcrumbs";

type Tab = "info" | "message" | "filter" | "executions" | "preview";

const TIMEZONES = [
  "America/Bogota",
  "America/Lima",
  "America/Mexico_City",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
  "UTC",
];

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
  const [editScheduleType, setEditScheduleType] = useState(4);
  const [editTimeZone, setEditTimeZone] = useState("America/Bogota");
  const [editRunAtUtc, setEditRunAtUtc] = useState("");
  const [editRecTimeOfDay, setEditRecTimeOfDay] = useState("");
  const [editRecIntervalDays, setEditRecIntervalDays] = useState("");
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

  const [aiDescription, setAiDescription] = useState("");
  const [aiTone, setAiTone] = useState("friendly");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadFlow = useCallback(() => {
    if (!id) return Promise.resolve(null);
    return getFlow(id).then((f) => {
      setFlow(f);
      setEditName(f.name);
      setEditDesc(f.description);
      setEditScheduleType(f.schedule.type);
      setEditTimeZone(f.schedule.timeZone);
      setEditRunAtUtc(f.schedule.runAtUtc ? f.schedule.runAtUtc.slice(0, 16) : "");
      setEditRecTimeOfDay(f.schedule.recurrenceTimeOfDay ?? "");
      setEditRecIntervalDays(f.schedule.recurrenceIntervalDays?.toString() ?? "");
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
      .catch((err) => { if (!cancelled) setError(err.detail ?? "Failed to load the flow."); })
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

  function act(label: string, doneMessage: string, fn: () => Promise<void>) {
    return async () => {
      setActionLoading(label);
      setError(null);
      try {
        await fn();
        await loadFlow();
        msg(doneMessage);
      } catch (err) {
        const e = err as { detail?: string };
        setError(e.detail ?? `Failed to ${label.toLowerCase()}.`);
      } finally {
        setActionLoading(null);
      }
    };
  }

  async function handleSaveInfo() {
    setActionLoading("save");
    setError(null);
    try {
      const schedule: ScheduleRequest = {
        type: editScheduleType,
        timeZone: editTimeZone,
      };
      if (editScheduleType === 1 && editRunAtUtc) {
        schedule.runAtUtc = new Date(editRunAtUtc).toISOString();
      }
      if (editScheduleType === 2) {
        if (editRecTimeOfDay) schedule.recurrenceTimeOfDay = editRecTimeOfDay;
        if (editRecIntervalDays) schedule.recurrenceIntervalDays = Number(editRecIntervalDays);
      }
      await updateFlow(id, { name: editName, description: editDesc, schedule });
      await loadFlow();
      msg("Information updated");
    } catch (err) {
      const e = err as { detail?: string };
      setError(e.detail ?? "Failed to save.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveMessage() {
    setActionLoading("message");
    setError(null);
    try {
      await updateFlowMessage(id, { message: messageText });
      await loadFlow();
      msg("Message updated");
    } catch (err) {
      const e = err as { detail?: string };
      setError(e.detail ?? "Failed to save the message.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleGenerateAI() {
    if (!flow) return;
    if (!aiDescription.trim()) {
      setAiError("Enter a description of the message.");
      return;
    }
    setIsGenerating(true);
    setAiError(null);
    try {
      const result = await generateMessage({
        description: aiDescription,
        tone: aiTone,
        datasetId: flow.datasetId,
      });
      setMessageText(result.messageTemplate);
      msg("Message generated with AI");
    } catch (err) {
      const e = err as { detail?: string };
      setAiError(e.detail ?? "Failed to generate the message.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveFilter() {
    setActionLoading("filter");
    setError(null);
    try {
      let parsed: FlowFilter | null = null;
      if (filterText.trim() && filterText.trim() !== "null") {
        parsed = JSON.parse(filterText) as FlowFilter;
      }
      await updateFlowFilter(id, parsed);
      await loadFlow();
      msg("Filter updated");
    } catch (err) {
      const e = err as { detail?: string };
      setError(e.detail ?? "Failed to save the filter.");
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
      setError(e.detail ?? "Failed to preview.");
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
      setError(e.detail ?? "Failed to preview the filter.");
    } finally {
      setActionLoading(null);
    }
  }

  function insertVariable(colName: string, colId: string) {
    setMessageText((prev) => prev + `{{${colId}}}`);
  }

  async function handleDelete() {
    if (!confirm("Delete this flow?")) return;
    setActionLoading("delete");
    setError(null);
    try {
      await deleteFlow(id);
      router.push("/flows");
    } catch (err) {
      const e = err as { detail?: string };
      setError(e.detail ?? "Failed to delete.");
    } finally {
      setActionLoading(null);
    }
  }

  if (isLoadingData) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-red-500">Flow not found.</p>
      </div>
    );
  }

  const canActivate = flow.status === 1 || flow.status === 3;
  const canPause = flow.status === 2;
  const canArchive = flow.status === 2 || flow.status === 3 || flow.status === 4;
  const canDelete = flow.status === 1 || flow.status === 5;
  const canExecute = flow.status === 2;

  const tabs: { key: Tab; label: string }[] = [
    { key: "info", label: "Info" },
    { key: "message", label: "Message" },
    { key: "filter", label: "Filter" },
    { key: "executions", label: "Executions" },
    { key: "preview", label: "Preview" },
  ];

  return (
    <div className="flex flex-1 bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-4xl mx-auto py-10 px-4 space-y-6">
        {/* Header */}
        <Breadcrumbs items={[
          { label: "Flows", href: "/flows" },
          { label: flow.name },
        ]} />
        <div className="flex items-center gap-3">
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
            <button onClick={act("Activate", "Flow activated", () => activateFlow(id))} disabled={actionLoading === "Activate"}
              className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
              {actionLoading === "Activate" ? "..." : "Activate"}
            </button>
          )}
          {canPause && (
            <button onClick={act("Pause", "Flow paused", () => pauseFlow(id))} disabled={actionLoading === "Pause"}
              className="rounded bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600 disabled:opacity-50">
              {actionLoading === "Pause" ? "..." : "Pause"}
            </button>
          )}
          {canArchive && (
            <button onClick={act("Archive", "Flow archived", () => archiveFlow(id))} disabled={actionLoading === "Archive"}
              className="rounded bg-zinc-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-600 disabled:opacity-50">
              {actionLoading === "Archive" ? "..." : "Archive"}
            </button>
          )}
          {canExecute && (
            <button onClick={act("Run", "Execution started", async () => { await executeFlow(id); })} disabled={actionLoading === "Run"}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {actionLoading === "Run" ? "..." : "Run now"}
            </button>
          )}
          {canDelete && (
            <button onClick={handleDelete} disabled={actionLoading === "delete"}
              className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {actionLoading === "delete" ? "..." : "Delete"}
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
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3">
                <p className="text-zinc-500">Channel</p>
                <p className="font-medium">{ChannelType[flow.channel] ?? flow.channel}</p>
              </div>
              <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3">
                <p className="text-zinc-500">Created</p>
                <p className="font-medium">{new Date(flow.createdAtUtc).toLocaleDateString("en-US")}</p>
              </div>
            </div>

            <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-3">
              <h3 className="text-sm font-semibold">Name and description</h3>
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
            </div>

            <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-3">
              <h3 className="text-sm font-semibold">Scheduling</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Execution type</label>
                  <select
                    value={editScheduleType}
                    onChange={(e) => setEditScheduleType(Number(e.target.value))}
                    className="w-full rounded border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
                  >
                    <option value={1}>OneTime</option>
                    <option value={2}>Recurring</option>
                    <option value={3}>DataTriggered</option>
                    <option value={4}>Immediate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Time zone</label>
                  <select
                    value={editTimeZone}
                    onChange={(e) => setEditTimeZone(e.target.value)}
                    className="w-full rounded border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>

              {editScheduleType === 1 && (
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Run date and time</label>
                  <input
                    type="datetime-local"
                    value={editRunAtUtc}
                    onChange={(e) => setEditRunAtUtc(e.target.value)}
                    className="w-full rounded border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
              )}

              {editScheduleType === 2 && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Time of day</label>
                    <input
                      type="time"
                      value={editRecTimeOfDay}
                      onChange={(e) => setEditRecTimeOfDay(e.target.value)}
                      className="w-full rounded border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Interval (days)</label>
                    <input
                      type="number"
                      min={1}
                      value={editRecIntervalDays}
                      onChange={(e) => setEditRecIntervalDays(e.target.value)}
                      className="w-full rounded border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleSaveInfo}
                disabled={actionLoading === "save"}
                className="rounded bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading === "save" ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Tab: Message */}
        {activeTab === "message" && (
          <div className="space-y-4">
            {columns.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-2">Insert variable:</p>
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

            {/* AI Generator */}
            <div className="rounded border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Generate with AI</span>
                <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 rounded px-1.5 py-0.5">beta</span>
              </div>
              <p className="text-xs text-zinc-500">
                Describe the message you want and the AI generates it using the dataset columns.
              </p>
              <textarea
                rows={2}
                value={aiDescription}
                onChange={(e) => setAiDescription(e.target.value)}
                placeholder="e.g. A friendly reminder that the invoice is due tomorrow."
                className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-zinc-500 mb-1">Tone</label>
                  <select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                    className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="friendly">Friendly</option>
                    <option value="professional">Professional</option>
                    <option value="formal">Formal</option>
                    <option value="casual">Casual</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGenerating}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isGenerating ? "Generating..." : "Generate"}
                </button>
              </div>
              {aiError && (
                <p className="text-xs text-red-600">{aiError}</p>
              )}
            </div>

            <textarea
              rows={5}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-zinc-400"
            />
            <button
              onClick={handleSaveMessage}
              disabled={actionLoading === "message"}
              className="rounded bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {actionLoading === "message" ? "Saving..." : "Save message"}
            </button>
          </div>
        )}

        {/* Tab: Filter */}
        {activeTab === "filter" && (
          <div className="space-y-4">
            <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-3">
              <h3 className="text-sm font-semibold">Filter JSON</h3>
              <p className="text-xs text-zinc-500">
                Operators: {Object.entries(FilterOperator).map(([k, v]) => `${k}=${v}`).join(", ")}
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
                  disabled={actionLoading === "filter"}
                  className="rounded bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
                >
                  {actionLoading === "filter" ? "Saving..." : "Save filter"}
                </button>
                <button
                  onClick={() => { setFilterText(""); }}
                  className="rounded border border-black/10 dark:border-white/10 px-4 py-1.5 text-sm font-medium hover:bg-black/[.04] dark:hover:bg-[#1a1a1a]"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-3">
              <h3 className="text-sm font-semibold">Filter preview</h3>
              <div className="flex items-center gap-2">
                <label className="text-sm">Sample limit:</label>
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
                  {actionLoading === "preview-filter" ? "Loading..." : "Preview"}
                </button>
              </div>
              {filterPreviewResult && (
                <div className="space-y-2">
                  <p className="text-sm">Matching rows: <strong>{filterPreviewResult.matchingRowCount}</strong></p>
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
              <p className="text-zinc-500 text-sm">No executions yet.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-zinc-100 dark:bg-zinc-800">
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        <th className="px-3 py-2 text-left font-medium">Source</th>
                        <th className="px-3 py-2 text-left font-medium">Started</th>
                        <th className="px-3 py-2 text-left font-medium">Finished</th>
                        <th className="px-3 py-2 text-left font-medium">Records</th>
                        <th className="px-3 py-2 text-left font-medium">Successful</th>
                        <th className="px-3 py-2 text-left font-medium">Failed</th>
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
                          <td className="px-3 py-2 text-xs">{new Date(ex.startedAtUtc).toLocaleString("en-US")}</td>
                          <td className="px-3 py-2 text-xs">{ex.completedAtUtc ? new Date(ex.completedAtUtc).toLocaleString("en-US") : "—"}</td>
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
                      <h3 className="text-sm font-semibold">Execution details</h3>
                      <button onClick={() => setSelectedExecId(null)} className="text-xs text-zinc-500 hover:underline">Close</button>
                    </div>
                    {isLoadingExecDetail ? (
                      <p className="text-sm text-zinc-500">Loading...</p>
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
                            <p className="text-zinc-500">Type</p>
                            <p>{ExecutionType[execDetail.executionType] ?? execDetail.executionType}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500">Status</p>
                            <p>{ExecutionStatus[execDetail.status] ?? execDetail.status}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500">Source</p>
                            <p>{TriggerSource[execDetail.triggerSource] ?? execDetail.triggerSource}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500">Started</p>
                            <p>{new Date(execDetail.startedAtUtc).toLocaleString("en-US")}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500">Finished</p>
                            <p>{execDetail.completedAtUtc ? new Date(execDetail.completedAtUtc).toLocaleString("en-US") : "—"}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500">Records</p>
                            <p>{execDetail.processedRecords}/{execDetail.totalRecords} ({execDetail.successfulRecords} ok, {execDetail.failedRecords} failed)</p>
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
                      <p className="text-sm text-red-500">Could not load the details.</p>
                    )}
                  </div>
                )}

                {execTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => setExecPage((p) => Math.max(1, p - 1))} disabled={execPage === 1}
                      className="rounded border border-black/10 dark:border-white/10 px-3 py-1 text-sm disabled:opacity-50">Previous</button>
                    <span className="text-sm text-zinc-500">Page {execPage} of {execTotalPages}</span>
                    <button onClick={() => setExecPage((p) => Math.min(execTotalPages, p + 1))} disabled={execPage === execTotalPages}
                      className="rounded border border-black/10 dark:border-white/10 px-3 py-1 text-sm disabled:opacity-50">Next</button>
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
              <h3 className="text-sm font-semibold">Message preview</h3>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Dataset Row ID (optional)</label>
                <input
                  type="text"
                  value={previewRowId}
                  onChange={(e) => setPreviewRowId(e.target.value)}
                  placeholder="UUID of a dataset row"
                  className="w-full rounded border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-zinc-400"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Sample values (JSON)</label>
                <textarea
                  rows={3}
                  value={previewSampleValues}
                  onChange={(e) => setPreviewSampleValues(e.target.value)}
                  placeholder='{"Name": "Carlos", "Email": "carlos@test.com"}'
                  className="w-full rounded border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-zinc-400"
                />
              </div>
              <button
                onClick={handlePreviewMessage}
                disabled={actionLoading === "preview-msg"}
                className="rounded bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading === "preview-msg" ? "Loading..." : "Preview"}
              </button>

              {previewResult && (
                <div className="rounded bg-zinc-50 dark:bg-zinc-800 p-3 space-y-2">
                  <p className="text-sm font-mono whitespace-pre-wrap">{previewResult.renderedMessage}</p>
                  {previewResult.missingVariables.length > 0 && (
                    <p className="text-xs text-yellow-600">
                      Missing variables: {previewResult.missingVariables.join(", ")}
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
