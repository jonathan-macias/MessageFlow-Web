"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDatasets, getDatasetColumns, createFlow } from "@/lib/api";
import { useAuth } from "@/lib/context/auth-context";
import type { DatasetListItem, DatasetColumn } from "@/lib/types/dataset";
import type { ScheduleRequest } from "@/lib/types/flow";
import { Breadcrumbs } from "@/components/breadcrumbs";

const TIMEZONES = [
  "America/Bogota",
  "America/Lima",
  "America/Mexico_City",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
  "UTC",
];

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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getDatasets()
      .then(setDatasets)
      .catch((err) => setError(err.detail ?? "Error al cargar datasets."))
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDatasetId) {
      setError("Selecciona un dataset.");
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
      setError(e.detail ?? "Error al crear flow.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-2xl mx-auto py-10 px-4 space-y-6">
        <Breadcrumbs items={[
          { label: "Flows", href: "/flows" },
          { label: "Crear flow" },
        ]} />
        <h1 className="text-2xl font-bold">Crear flow</h1>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded p-2">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic info */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
              Informacion basica
            </h2>
            <div>
              <label htmlFor="flow-name" className="block text-sm font-medium mb-1">
                Nombre
              </label>
              <input
                id="flow-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="flow-desc" className="block text-sm font-medium mb-1">
                Descripcion
              </label>
              <input
                id="flow-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="flow-channel" className="block text-sm font-medium mb-1">
                Canal
              </label>
              <select
                id="flow-channel"
                value={channel}
                onChange={(e) => setChannel(Number(e.target.value))}
                className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <option value={1}>WhatsApp</option>
              </select>
            </div>
          </div>

          {/* Dataset selection */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
              Dataset
            </h2>
            <div>
              <label htmlFor="flow-dataset" className="block text-sm font-medium mb-1">
                Seleccionar dataset
              </label>
              <select
                id="flow-dataset"
                required
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <option value="">
                  {isLoadingData ? "Cargando..." : "Seleccionar..."}
                </option>
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Message template */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
              Mensaje
            </h2>

            {columns.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-2">
                  Click para insertar una variable en el mensaje:
                </p>
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

            <div>
              <label htmlFor="flow-template" className="block text-sm font-medium mb-1">
                Template del mensaje
              </label>
              <textarea
                id="flow-template"
                required
                rows={4}
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                placeholder="Ej: Hola {{Nombre}}, tu ID es {{Identificacion}}."
                className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-zinc-400"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Usa {"{{columnId}}"} para insertar valores del dataset.
              </p>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
              Programacion
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="flow-type" className="block text-sm font-medium mb-1">
                  Tipo de ejecucion
                </label>
                <select
                  id="flow-type"
                  value={scheduleType}
                  onChange={(e) => setScheduleType(Number(e.target.value))}
                  className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  <option value={1}>OneTime</option>
                  <option value={2}>Recurring</option>
                  <option value={3}>DataTriggered</option>
                  <option value={4}>Immediate</option>
                </select>
              </div>
              <div>
                <label htmlFor="flow-tz" className="block text-sm font-medium mb-1">
                  Zona horaria
                </label>
                <select
                  id="flow-tz"
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {scheduleType === 1 && (
              <div>
                <label htmlFor="flow-runat" className="block text-sm font-medium mb-1">
                  Fecha y hora de ejecucion
                </label>
                <input
                  id="flow-runat"
                  type="datetime-local"
                  value={runAtUtc}
                  onChange={(e) => setRunAtUtc(e.target.value)}
                  className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
                />
              </div>
            )}

            {scheduleType === 2 && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="flow-rec-time" className="block text-sm font-medium mb-1">
                    Hora del dia
                  </label>
                  <input
                    id="flow-rec-time"
                    type="time"
                    value={recurrenceTimeOfDay}
                    onChange={(e) => setRecurrenceTimeOfDay(e.target.value)}
                    className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
                <div>
                  <label htmlFor="flow-rec-interval" className="block text-sm font-medium mb-1">
                    Intervalo (dias)
                  </label>
                  <input
                    id="flow-rec-interval"
                    type="number"
                    min={1}
                    value={recurrenceIntervalDays}
                    onChange={(e) => setRecurrenceIntervalDays(e.target.value)}
                    className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded bg-foreground py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Creando..." : "Crear flow"}
          </button>
        </form>
      </div>
    </div>
  );
}
