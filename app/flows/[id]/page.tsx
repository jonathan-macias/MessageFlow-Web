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
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Alert } from "@/components/ui/alert";
import { FlowStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconArchive, IconCheckCircle, IconPause, IconPlay, IconTrash } from "@/components/ui/icons";
import { PageShell } from "@/components/ui/page-shell";
import { Spinner } from "@/components/ui/spinner";
import { TabPanel, Tabs, type TabItem } from "@/components/ui/tabs";
import { ExecutionsTab } from "@/components/flows/executions-tab";
import { FilterTab, type FilterPreviewResult } from "@/components/flows/filter-tab";
import { InfoTab } from "@/components/flows/info-tab";
import { MessageTab } from "@/components/flows/message-tab";
import { PreviewTab } from "@/components/flows/preview-tab";

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
  const [filterPreviewResult, setFilterPreviewResult] = useState<FilterPreviewResult | null>(null);

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
      <main className="flex flex-1 items-center justify-center">
        <div role="status" className="flex items-center gap-2 text-sm text-muted">
          <Spinner />
          Loading...
        </div>
      </main>
    );
  }

  if (!flow) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p role="alert" className="text-bad-fg">Flow not found.</p>
      </main>
    );
  }

  const canActivate = flow.status === 1 || flow.status === 3;
  const canPause = flow.status === 2;
  const canArchive = flow.status === 2 || flow.status === 3 || flow.status === 4;
  const canDelete = flow.status === 1 || flow.status === 5;
  const canExecute = flow.status === 2;

  const tabs: TabItem[] = [
    { id: "info", label: "Info" },
    { id: "message", label: "Message" },
    { id: "filter", label: "Filter" },
    { id: "executions", label: "Executions" },
    { id: "preview", label: "Preview" },
  ];

  return (
    <PageShell width="4xl">
      {/* Header */}
      <div>
        <Breadcrumbs items={[
          { label: "Flows", href: "/flows" },
          { label: flow.name },
        ]} />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight text-fg">{flow.name}</h1>
          <FlowStatusBadge status={flow.status} />
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      {/* Actions bar */}
      <div className="flex flex-wrap gap-2">
        {canActivate && (
          <Button variant="success" size="sm" onClick={act("Activate", "Flow activated", () => activateFlow(id))} loading={actionLoading === "Activate"}>
            <IconCheckCircle className="size-3.5" />
            Activate
          </Button>
        )}
        {canPause && (
          <Button variant="warning" size="sm" onClick={act("Pause", "Flow paused", () => pauseFlow(id))} loading={actionLoading === "Pause"}>
            <IconPause className="size-3.5" />
            Pause
          </Button>
        )}
        {canArchive && (
          <Button variant="secondary" size="sm" onClick={act("Archive", "Flow archived", () => archiveFlow(id))} loading={actionLoading === "Archive"}>
            <IconArchive className="size-3.5" />
            Archive
          </Button>
        )}
        {canExecute && (
          <Button variant="primary" size="sm" onClick={act("Run", "Execution started", async () => { await executeFlow(id); })} loading={actionLoading === "Run"}>
            <IconPlay className="size-3.5" />
            Run now
          </Button>
        )}
        {canDelete && (
          <Button variant="danger" size="sm" onClick={handleDelete} loading={actionLoading === "delete"}>
            <IconTrash className="size-3.5" />
            Delete
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div>
        <Tabs tabs={tabs} value={activeTab} onChange={(t) => setActiveTab(t as Tab)} idPrefix="flow" label="Flow sections" />

        <TabPanel id="info" idPrefix="flow" className={activeTab === "info" ? "pt-6" : "hidden"}>
          {activeTab === "info" && (
            <InfoTab
              flow={flow}
              name={editName}
              onNameChange={setEditName}
              description={editDesc}
              onDescriptionChange={setEditDesc}
              scheduleType={editScheduleType}
              onScheduleTypeChange={setEditScheduleType}
              timeZone={editTimeZone}
              onTimeZoneChange={setEditTimeZone}
              runAtUtc={editRunAtUtc}
              onRunAtUtcChange={setEditRunAtUtc}
              recTimeOfDay={editRecTimeOfDay}
              onRecTimeOfDayChange={setEditRecTimeOfDay}
              recIntervalDays={editRecIntervalDays}
              onRecIntervalDaysChange={setEditRecIntervalDays}
              onSave={handleSaveInfo}
              isSaving={actionLoading === "save"}
            />
          )}
        </TabPanel>

        <TabPanel id="message" idPrefix="flow" className={activeTab === "message" ? "pt-6" : "hidden"}>
          {activeTab === "message" && (
            <MessageTab
              columns={columns}
              onInsertVariable={(col) => insertVariable(col.name, col.id)}
              aiDescription={aiDescription}
              onAiDescriptionChange={setAiDescription}
              aiTone={aiTone}
              onAiToneChange={setAiTone}
              isGenerating={isGenerating}
              aiError={aiError}
              onGenerate={handleGenerateAI}
              messageText={messageText}
              onMessageTextChange={setMessageText}
              onSave={handleSaveMessage}
              isSaving={actionLoading === "message"}
            />
          )}
        </TabPanel>

        <TabPanel id="filter" idPrefix="flow" className={activeTab === "filter" ? "pt-6" : "hidden"}>
          {activeTab === "filter" && (
            <FilterTab
              filterText={filterText}
              onFilterTextChange={setFilterText}
              onSave={handleSaveFilter}
              isSaving={actionLoading === "filter"}
              onClear={() => { setFilterText(""); }}
              previewLimit={filterPreviewLimit}
              onPreviewLimitChange={setFilterPreviewLimit}
              onPreview={handlePreviewFilter}
              isPreviewing={actionLoading === "preview-filter"}
              previewResult={filterPreviewResult}
            />
          )}
        </TabPanel>

        <TabPanel id="executions" idPrefix="flow" className={activeTab === "executions" ? "pt-6" : "hidden"}>
          {activeTab === "executions" && (
            <ExecutionsTab
              executions={executions}
              selectedId={selectedExecId}
              onSelect={setSelectedExecId}
              detail={execDetail}
              isLoadingDetail={isLoadingExecDetail}
              page={execPage}
              totalPages={execTotalPages}
              onPrevious={() => setExecPage((p) => Math.max(1, p - 1))}
              onNext={() => setExecPage((p) => Math.min(execTotalPages, p + 1))}
            />
          )}
        </TabPanel>

        <TabPanel id="preview" idPrefix="flow" className={activeTab === "preview" ? "pt-6" : "hidden"}>
          {activeTab === "preview" && (
            <PreviewTab
              rowId={previewRowId}
              onRowIdChange={setPreviewRowId}
              sampleValues={previewSampleValues}
              onSampleValuesChange={setPreviewSampleValues}
              onPreview={handlePreviewMessage}
              isLoading={actionLoading === "preview-msg"}
              result={previewResult}
            />
          )}
        </TabPanel>
      </div>
    </PageShell>
  );
}
