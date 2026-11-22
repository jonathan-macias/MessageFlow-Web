"use client";

import type { DatasetColumn } from "@/lib/types/dataset";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { IconPlus } from "@/components/ui/icons";
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

function ValueInput({
  draft,
  column,
  disabled,
  onChange,
  id,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  draft: FilterDraft;
  column: DatasetColumn;
  disabled: boolean;
  onChange: (value: string) => void;
  /** Los recibe del <Field> que lo envuelve. */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const common = {
    id: id ?? `filter-value-${draft.id}`,
    value: draft.value,
    disabled,
    "aria-describedby": describedBy,
    "aria-invalid": invalid,
    "aria-label": `Filter value for ${column.name}`,
  };
  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange(event.target.value);

  if (column.dataType === ColumnDataType.Boolean) {
    return (
      <Select {...common} onChange={handleChange}>
        <option value="">Select...</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </Select>
    );
  }

  if (column.dataType === ColumnDataType.Number) {
    return <Input {...common} onChange={handleChange} type="number" inputMode="decimal" step="any" />;
  }

  if (column.dataType === ColumnDataType.Date) {
    return <Input {...common} onChange={handleChange} type="date" />;
  }

  return <Input {...common} onChange={handleChange} type="text" />;
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
      <legend className="text-sm font-medium text-fg mb-1">Filters (optional)</legend>
      <p className="text-xs text-subtle mb-2">
        They narrow down which rows are searched, but not the order: relevance is decided
        by the meaning of the text. Filters are combined with AND, up to {MAX_FILTERS}.
      </p>

      {drafts.length === 0 && (
        <p className="text-xs text-subtle border border-dashed border-line rounded-lg p-3">
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
          <div key={draft.id} className="rounded-lg border border-line bg-raised/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">
                Filter {index + 1}
                {column ? ` · ${dataTypeLabel(column.dataType)}` : ""}
              </span>
              <button
                type="button"
                onClick={() => onChange(drafts.filter((item) => item.id !== draft.id))}
                className="rounded-md px-1.5 py-0.5 text-xs text-muted hover:bg-raised hover:text-bad-fg transition-colors"
              >
                Remove
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Column" labelSize="sm">
                <Select
                  value={draft.column}
                  onChange={(event) => selectColumn(draft, event.target.value)}
                  aria-label={`Column of filter ${index + 1}`}
                >
                  <option value="">Select...</option>
                  {columns.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name} ({dataTypeLabel(item.dataType)})
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Operator" labelSize="sm">
                <Select
                  value={draft.operator}
                  onChange={(event) => selectOperator(draft, event.target.value as DraftOperator)}
                  disabled={!column}
                  aria-label={`Operator of filter ${index + 1}`}
                >
                  <option value="">Select...</option>
                  {operators.map((operator) => (
                    <option key={operator} value={operator}>
                      {operatorLabel(operator)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {showValue && column && (
              <Field label="Value" labelSize="sm">
                <ValueInput
                  draft={draft}
                  column={column}
                  disabled={disabled}
                  onChange={(value) => update(draft.id, { value })}
                />
              </Field>
            )}

            {error && <p className="text-xs text-bad-fg">{error}</p>}
          </div>
        );
      })}

      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange([...drafts, newFilterDraft()])}
        disabled={isFull}
      >
        {!isFull && <IconPlus className="size-3.5" />}
        {isFull ? `Maximum ${MAX_FILTERS} filters` : "Add filter"}
      </Button>
    </fieldset>
  );
}
