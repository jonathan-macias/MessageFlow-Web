import type { DatasetColumn } from "@/lib/types/dataset";

interface VariableChipsProps {
  columns: DatasetColumn[];
  label: string;
  onInsert: (column: DatasetColumn) => void;
}

/** Botones para insertar columnas del dataset como variables {{id}} en la plantilla. */
export function VariableChips({ columns, label, onInsert }: VariableChipsProps) {
  if (columns.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {columns.map((col) => (
          <button
            key={col.id}
            type="button"
            onClick={() => onInsert(col)}
            className="rounded-full border border-line bg-raised px-2.5 py-1 font-mono text-xs text-fg transition-colors hover:border-accent hover:text-accent"
          >
            {col.name}
          </button>
        ))}
      </div>
    </div>
  );
}
