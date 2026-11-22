"use client";

import type { DatasetColumn } from "@/lib/types/dataset";
import {
  ColumnDataType,
  dataTypeLabel,
  operatorLabel,
  operatorNeedsValue,
  operatorsForDataType,
} from "@/lib/semantic-search/columns";
import {
  defaultOperatorForColumn,
  findColumn,
  MAX_FILTERS,
  newFilterDraft,
  type DraftOperator,
  type FilterDraft,
} from "@/lib/semantic-search/filters";

interface FilterBuilderProps {
  columns: DatasetColumn[];
  drafts: FilterDraft[];
  errors: Record<string, string>;
  disabled: boolean;
  onChange: (drafts: FilterDraft[]) => void;
}

const inputClass =
  "w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-50";

function ValueInput({
  draft,
  column,
  disabled,
  onChange,
}: {
  draft: FilterDraft;
  column: DatasetColumn;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const common = {
    id: `filter-value-${draft.id}`,
    value: draft.value,
    disabled,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => onChange(event.target.value),
    className: inputClass,
    "aria-label": `Filter value for ${column.name}`,
  };

  if (column.dataType === ColumnDataType.Boolean) {
    return (
      <select {...common}>
        <option value="">Select...</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  if (column.dataType === ColumnDataType.Number) {
    return <input {...common} type="number" inputMode="decimal" step="any" />;
  }

  if (column.dataType === ColumnDataType.Date) {
    return <input {...common} type="date" />;
  }

  return <input {...common} type="text" />;
}

export function FilterBuilder({
  columns,
  drafts,
  errors,
  disabled,
  onChange,
}: FilterBuilderProps) {
  const isFull = drafts.length >= MAX_FILTERS;

  function update(id: string, patch: Partial<FilterDraft>) {
    onChange(drafts.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  }

  function selectColumn(draft: FilterDraft, columnName: string) {
    const column = findColumn(columns, columnName);
    const operator = defaultOperatorForColumn(column);
    // El valor anterior pertenece al tipo anterior: se descarta para no enviar
    // "2024-01-01" contra una columna de texto, por ejemplo.
    update(draft.id, { column: columnName, operator, value: "" });
  }

  function selectOperator(draft: FilterDraft, operator: DraftOperator) {
    const needsValue = operator ? operatorNeedsValue(operator) : false;
    update(draft.id, { operator, ...(needsValue ? {} : { value: "" }) });
  }

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium mb-1">Filters (optional)</legend>
      <p className="text-xs text-zinc-500 mb-2">
        They narrow down which rows are searched, but not the order: relevance is decided
        by the meaning of the text. Filters are combined with AND, up to {MAX_FILTERS}.
      </p>

      {drafts.length === 0 && (
        <p className="text-xs text-zinc-400 border border-dashed border-black/10 dark:border-white/10 rounded-lg p-3">
          No filters: rows are searched across the whole dataset.
        </p>
      )}

      {drafts.map((draft, index) => {
        const column = findColumn(columns, draft.column);
        const operators = column ? operatorsForDataType(column.dataType) : [];
        const activeOperator = draft.operator === "" ? null : draft.operator;
        const showValue = activeOperator !== null && operatorNeedsValue(activeOperator);
        const error = errors[draft.id];

        return (
          <div
            key={draft.id}
            className="rounded-lg border border-black/10 dark:border-white/10 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">
                Filter {index + 1}
                {column ? ` · ${dataTypeLabel(column.dataType)}` : ""}
              </span>
              <button
                type="button"
                onClick={() => onChange(drafts.filter((item) => item.id !== draft.id))}
                className="text-xs text-zinc-500 hover:text-red-600 transition-colors"
              >
                Remove
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs space-y-1">
                <span className="text-zinc-500">Column</span>
                <select
                  value={draft.column}
                  onChange={(event) => selectColumn(draft, event.target.value)}
                  className={inputClass}
                  aria-label={`Column of filter ${index + 1}`}
                >
                  <option value="">Select...</option>
                  {columns.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name} ({dataTypeLabel(item.dataType)})
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs space-y-1">
                <span className="text-zinc-500">Operator</span>
                <select
                  value={draft.operator}
                  onChange={(event) => selectOperator(draft, event.target.value as DraftOperator)}
                  disabled={!column}
                  className={inputClass}
                  aria-label={`Operator of filter ${index + 1}`}
                >
                  <option value="">Select...</option>
                  {operators.map((operator) => (
                    <option key={operator} value={operator}>
                      {operatorLabel(operator)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {showValue && column && (
              <label className="text-xs space-y-1 block">
                <span className="text-zinc-500">Value</span>
                <ValueInput
                  draft={draft}
                  column={column}
                  disabled={disabled}
                  onChange={(value) => update(draft.id, { value })}
                />
              </label>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...drafts, newFilterDraft()])}
        disabled={isFull}
        className="rounded-full border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs hover:bg-black/[.04] dark:hover:bg-white/[.06] disabled:opacity-50 transition-colors"
      >
        {isFull ? `Maximum ${MAX_FILTERS} filters` : "Add filter"}
      </button>
    </fieldset>
  );
}
