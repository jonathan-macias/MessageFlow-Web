"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDatasets, getDatasetColumns, createFlow, generateMessage } from "@/lib/api";
import { useAuth } from "@/lib/context/auth-context";
import type { DatasetListItem, DatasetColumn } from "@/lib/types/dataset";
import type { ScheduleRequest } from "@/lib/types/flow";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { AIGeneratorBox } from "@/components/flows/ai-generator-box";
import { ScheduleFields } from "@/components/flows/schedule-fields";
import { VariableChips } from "@/components/flows/variable-chips";

export default function NewFlowPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [datasets, setDatasets] = useState<DatasetListItem[]>([]);
  const [columns, setColumns] = useState<DatasetColumn[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState(1);
  const [messageTemplate, setMessageTemplate] = useState("");
  const [scheduleType, setScheduleType] = useState(4);
  const [timeZone, setTimeZone] = useState("America/Bogota");
  const [runAtUtc, setRunAtUtc] = useState("");
  const [recurrenceTimeOfDay, setRecurrenceTimeOfDay] = useState("");
  const [recurrenceIntervalDays, setRecurrenceIntervalDays] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [aiDescription, setAiDescription] = useState("");
  const [aiTone, setAiTone] = useState("friendly");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getDatasets()
      .then(setDatasets)
      .catch((err) => setError(err.detail ?? "Failed to load datasets."))
      .finally(() => setIsLoadingData(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !selectedDatasetId) return;
    let cancelled = false;
    getDatasetColumns(selectedDatasetId)
      .then((cols) => { if (!cancelled) setColumns(cols); })
      .catch(() => { if (!cancelled) setColumns([]); });
    return () => { cancelled = true; };
  }, [isAuthenticated, selectedDatasetId]);

  if (isLoading || !isAuthenticated) return null;

  function insertVariable(colName: string, colId: string) {
    const tag = `{{${colId}}}`;
    setMessageTemplate((prev) => prev + tag);
  }

  async function handleGenerateAI() {
    if (!selectedDatasetId) {
      setAiError("Select a dataset first.");
      return;
    }
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
        datasetId: selectedDatasetId,
      });
      setMessageTemplate(result.messageTemplate);
    } catch (err) {
      const e = err as { detail?: string };
      setAiError(e.detail ?? "Failed to generate the message.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDatasetId) {
      setError("Select a dataset.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const schedule: ScheduleRequest = {
      type: scheduleType,
      timeZone,
    };
    if (scheduleType === 1 && runAtUtc) {
      schedule.runAtUtc = new Date(runAtUtc).toISOString();
    }
    if (scheduleType === 2) {
      if (recurrenceTimeOfDay) schedule.recurrenceTimeOfDay = recurrenceTimeOfDay;
      if (recurrenceIntervalDays) schedule.recurrenceIntervalDays = Number(recurrenceIntervalDays);
    }

    try {
      await createFlow({
        name,
        description,
        datasetId: selectedDatasetId,
        channel,
        messageTemplate,
        schedule,
      });
      router.push(`/flows`);
    } catch (err) {
      const e = err as { detail?: string };
      setError(e.detail ?? "Failed to create the flow.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell width="2xl">
      <div>
        <Breadcrumbs items={[
          { label: "Flows", href: "/flows" },
          { label: "Create flow" },
        ]} />
        <PageHeader title="Create flow" />
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <section className="space-y-2">
          <SectionTitle>Basic information</SectionTitle>
          <Card className="space-y-4">
            <Field label="Name">
              <Input
                id="flow-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Description">
              <Input
                id="flow-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Field label="Channel">
              <Select
                id="flow-channel"
                value={channel}
                onChange={(e) => setChannel(Number(e.target.value))}
              >
                <option value={1}>WhatsApp</option>
              </Select>
            </Field>
          </Card>
        </section>

        {/* Dataset selection */}
        <section className="space-y-2">
          <SectionTitle>Dataset</SectionTitle>
          <Card>
            <Field label="Select dataset">
              <Select
                id="flow-dataset"
                required
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
              >
                <option value="">
                  {isLoadingData ? "Loading..." : "Select..."}
                </option>
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name}
                  </option>
                ))}
              </Select>
            </Field>
          </Card>
        </section>

        {/* Message template */}
        <section className="space-y-2">
          <SectionTitle>Message</SectionTitle>
          <Card className="space-y-4">
            <VariableChips
              columns={columns}
              label="Click to insert a variable into the message:"
              onInsert={(col) => insertVariable(col.name, col.id)}
            />

            {selectedDatasetId && (
              <AIGeneratorBox
                description={aiDescription}
                onDescriptionChange={setAiDescription}
                tone={aiTone}
                onToneChange={setAiTone}
                isGenerating={isGenerating}
                error={aiError}
                onGenerate={handleGenerateAI}
              />
            )}

            <Field label="Message template" hint={<>Use {"{{columnId}}"} to insert dataset values.</>}>
              <Textarea
                id="flow-template"
                required
                rows={4}
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                placeholder="e.g. Hi {{Name}}, your ID is {{Identification}}."
                className="font-mono"
              />
            </Field>
          </Card>
        </section>

        {/* Schedule */}
        <section className="space-y-2">
          <SectionTitle>Scheduling</SectionTitle>
          <Card className="space-y-4">
            <ScheduleFields
              idPrefix="flow"
              scheduleType={scheduleType}
              onScheduleTypeChange={setScheduleType}
              timeZone={timeZone}
              onTimeZoneChange={setTimeZone}
              runAtUtc={runAtUtc}
              onRunAtUtcChange={setRunAtUtc}
              recurrenceTimeOfDay={recurrenceTimeOfDay}
              onRecurrenceTimeOfDayChange={setRecurrenceTimeOfDay}
              recurrenceIntervalDays={recurrenceIntervalDays}
              onRecurrenceIntervalDaysChange={setRecurrenceIntervalDays}
            />
          </Card>
        </section>

        <Button type="submit" loading={isSubmitting} className="w-full">
          {isSubmitting ? "Creating..." : "Create flow"}
        </Button>
      </form>
    </PageShell>
  );
}
