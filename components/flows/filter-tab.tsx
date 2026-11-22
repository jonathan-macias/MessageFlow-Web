import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { FilterOperator } from "@/lib/types/flow";

export interface FilterPreviewResult {
  matchingRowCount: number;
  sampleRows: Array<{ id: string; rowNumber: number; values: Record<string, string | null> }>;
}

interface FilterTabProps {
  filterText: string;
  onFilterTextChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  onClear: () => void;
  previewLimit: number;
  onPreviewLimitChange: (value: number) => void;
  onPreview: () => void;
  isPreviewing: boolean;
  previewResult: FilterPreviewResult | null;
}

export function FilterTab({
  filterText,
  onFilterTextChange,
  onSave,
  isSaving,
  onClear,
  previewLimit,
  onPreviewLimitChange,
  onPreview,
  isPreviewing,
  previewResult,
}: FilterTabProps) {
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-fg">Filter JSON</h3>
        <Field
          label="Filter definition"
          labelSize="sm"
          hint={<>Operators: {Object.entries(FilterOperator).map(([k, v]) => `${k}=${v}`).join(", ")}</>}
        >
          <Textarea
            rows={8}
            value={filterText}
            onChange={(e) => onFilterTextChange(e.target.value)}
            placeholder='{"composition":1,"conditions":[...],"groups":null}'
            className="font-mono"
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onSave} loading={isSaving}>
            {isSaving ? "Saving..." : "Save filter"}
          </Button>
          <Button variant="secondary" onClick={onClear}>
            Clear
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-fg">Filter preview</h3>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="filter-preview-limit" className="text-sm text-fg">
            Sample limit:
          </label>
          <Input
            id="filter-preview-limit"
            type="number"
            min={1}
            value={previewLimit}
            onChange={(e) => onPreviewLimitChange(Number(e.target.value))}
            className="w-20"
          />
          <Button onClick={onPreview} loading={isPreviewing}>
            {isPreviewing ? "Loading..." : "Preview"}
          </Button>
        </div>
        {previewResult && (
          <div className="space-y-2">
            <p className="text-sm text-fg">
              Matching rows: <strong>{previewResult.matchingRowCount}</strong>
            </p>
            {previewResult.sampleRows.length > 0 && (
              <Table>
                <THead>
                  <tr>
                    <Th className="text-xs">#</Th>
                    {Object.keys(previewResult.sampleRows[0].values).map((k) => (
                      <Th key={k} className="text-xs">
                        {k}
                      </Th>
                    ))}
                  </tr>
                </THead>
                <tbody>
                  {previewResult.sampleRows.map((r) => (
                    <Tr key={r.id}>
                      <Td className="text-xs text-muted">{r.rowNumber}</Td>
                      {Object.entries(r.values).map(([k, v]) => (
                        <Td key={k} className="text-xs">
                          {v ?? "—"}
                        </Td>
                      ))}
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
