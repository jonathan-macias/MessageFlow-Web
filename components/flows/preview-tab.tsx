import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";

interface PreviewTabProps {
  rowId: string;
  onRowIdChange: (value: string) => void;
  sampleValues: string;
  onSampleValuesChange: (value: string) => void;
  onPreview: () => void;
  isLoading: boolean;
  result: { renderedMessage: string; missingVariables: string[] } | null;
}

export function PreviewTab({
  rowId,
  onRowIdChange,
  sampleValues,
  onSampleValuesChange,
  onPreview,
  isLoading,
  result,
}: PreviewTabProps) {
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-fg">Message preview</h3>
        <Field label="Dataset Row ID (optional)" labelSize="sm">
          <Input
            type="text"
            value={rowId}
            onChange={(e) => onRowIdChange(e.target.value)}
            placeholder="UUID of a dataset row"
            className="font-mono"
          />
        </Field>
        <Field label="Sample values (JSON)" labelSize="sm">
          <Textarea
            rows={3}
            value={sampleValues}
            onChange={(e) => onSampleValuesChange(e.target.value)}
            placeholder='{"Name": "Carlos", "Email": "carlos@test.com"}'
            className="font-mono"
          />
        </Field>
        <Button onClick={onPreview} loading={isLoading}>
          {isLoading ? "Loading..." : "Preview"}
        </Button>

        {result && (
          <div className="space-y-2 rounded-lg border border-line bg-raised p-3">
            <p className="whitespace-pre-wrap font-mono text-sm text-fg">{result.renderedMessage}</p>
            {result.missingVariables.length > 0 && (
              <p className="text-xs text-warn-fg">Missing variables: {result.missingVariables.join(", ")}</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
