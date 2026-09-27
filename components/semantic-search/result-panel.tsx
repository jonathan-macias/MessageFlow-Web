"use client";

import type { DatasetColumn } from "@/lib/types/dataset";
import type { SemanticSearchResponse } from "@/lib/types/ai";
import {
  formatCellValue,
  formatOperatorForCopy,
  formatSimilarity,
  similarityTone,
} from "@/lib/semantic-search/columns";

function orderedColumnNames(
  response: SemanticSearchResponse,
  columns: DatasetColumn[],
): string[] {
  const present = Object.keys(response.matches[0]?.values ?? {});
  if (present.length === 0) return [];

  const known = columns
    .map((column) => column.name)
    .filter((name) => present.includes(name));
  const unknown = present.filter((name) => !known.includes(name));
  return [...known, ...unknown];
}

function AppliedFilters({ response }: { response: SemanticSearchResponse }) {
  if (response.appliedFilters.length === 0) return null;

  return (
    <div className="text-xs text-zinc-500 flex flex-wrap gap-1.5">
      {response.appliedFilters.map((filter, index) => (
        <span
          key={`${filter.column}-${index}`}
          className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1"
        >
          {filter.column} {formatOperatorForCopy(filter.operator)}
          {filter.value ? ` "${filter.value}"` : ""}
        </span>
      ))}
    </div>
  );
}

export function ResultPanel({
  response,
  columns,
}: {
  response: SemanticSearchResponse;
  columns: DatasetColumn[];
}) {
  const columnNames = orderedColumnNames(response, columns);
  const dataTypeByName = new Map(columns.map((column) => [column.name, column.dataType]));
  const hasMatches = response.matches.length > 0;
  const isPartiallyIndexed = response.indexedRows < response.totalRows;

  return (
    <section className="space-y-4" aria-label="Resultado de la búsqueda semántica">
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <p className="text-sm whitespace-pre-wrap">{response.answer}</p>
        <AppliedFilters response={response} />
        <p className="text-xs text-zinc-400">
          {hasMatches
            ? `${response.matches.length} ${response.matches.length === 1 ? "fila coincide" : "filas coinciden"} de ${response.indexedRows.toLocaleString("es-CO")} filas indexadas`
            : `${response.totalRows.toLocaleString("es-CO")} filas en el dataset`}
          {" · "}
          {isPartiallyIndexed
            ? `solo ${response.indexedRows.toLocaleString("es-CO")} tienen columnas de texto y participan en la búsqueda`
            : "todas las filas tienen columnas de texto y participan en la búsqueda"}
        </p>
      </div>

      {hasMatches ? (
        <ul className="space-y-3">
          {response.matches.map((match) => (
            <li
              key={match.rowId}
              className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-500">Fila {match.rowNumber} del archivo</span>
                <span
                  className={`text-xs font-medium rounded-full px-2.5 py-1 ${similarityTone(match.similarity)}`}
                >
                  relevancia {formatSimilarity(match.similarity)}
                </span>
              </div>
              <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 text-sm">
                {columnNames.map((name) => (
                  <div key={name} className="flex justify-between gap-3 border-b border-black/5 dark:border-white/5 py-1">
                    <dt className="text-zinc-500 truncate">{name}</dt>
                    <dd className="text-right truncate">
                      {formatCellValue(match.values[name] ?? null, dataTypeByName.get(name))}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-black/15 dark:border-white/15 p-4 space-y-1">
          <p className="text-sm font-medium">Sin coincidencias</p>
          <p className="text-xs text-zinc-500">
            La búsqueda se completó correctamente y ninguna fila se parece a la pregunta. La
            respuesta de la IA está arriba.
          </p>
        </div>
      )}
    </section>
  );
}
