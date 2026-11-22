import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/field";
import { IconSparkles } from "@/components/ui/icons";

interface AIGeneratorBoxProps {
  description: string;
  onDescriptionChange: (value: string) => void;
  tone: string;
  onToneChange: (value: string) => void;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
}

/** Generador de mensajes con IA (compartido por la creación y la edición de flows). */
export function AIGeneratorBox({
  description,
  onDescriptionChange,
  tone,
  onToneChange,
  isGenerating,
  error,
  onGenerate,
}: AIGeneratorBoxProps) {
  return (
    <Card className="space-y-3 border-accent/30 bg-accent-soft">
      <div className="flex items-center gap-2">
        <IconSparkles className="size-4 text-accent" />
        <span className="text-sm font-semibold text-fg">Generate with AI</span>
        <span className="rounded-full border border-accent/40 px-1.5 py-0.5 text-xs font-medium text-accent">beta</span>
      </div>
      <p className="text-xs text-muted">
        Describe the message you want and the AI generates it using the dataset columns.
      </p>
      <Field label="Describe the message" labelSize="sm">
        <Textarea
          rows={2}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="e.g. A friendly reminder that the invoice is due tomorrow."
        />
      </Field>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Tone" labelSize="sm" className="min-w-40 flex-1">
          <Select value={tone} onChange={(e) => onToneChange(e.target.value)}>
            <option value="friendly">Friendly</option>
            <option value="professional">Professional</option>
            <option value="formal">Formal</option>
            <option value="casual">Casual</option>
          </Select>
        </Field>
        <Button onClick={onGenerate} loading={isGenerating}>
          {isGenerating ? "Generating..." : "Generate"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-bad-fg">
          {error}
        </p>
      )}
    </Card>
  );
}
