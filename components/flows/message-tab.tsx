import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import type { DatasetColumn } from "@/lib/types/dataset";
import { AIGeneratorBox } from "./ai-generator-box";
import { VariableChips } from "./variable-chips";

interface MessageTabProps {
  columns: DatasetColumn[];
  onInsertVariable: (column: DatasetColumn) => void;
  aiDescription: string;
  onAiDescriptionChange: (value: string) => void;
  aiTone: string;
  onAiToneChange: (value: string) => void;
  isGenerating: boolean;
  aiError: string | null;
  onGenerate: () => void;
  messageText: string;
  onMessageTextChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function MessageTab({
  columns,
  onInsertVariable,
  aiDescription,
  onAiDescriptionChange,
  aiTone,
  onAiToneChange,
  isGenerating,
  aiError,
  onGenerate,
  messageText,
  onMessageTextChange,
  onSave,
  isSaving,
}: MessageTabProps) {
  return (
    <div className="space-y-4">
      <VariableChips columns={columns} label="Insert variable:" onInsert={onInsertVariable} />

      <AIGeneratorBox
        description={aiDescription}
        onDescriptionChange={onAiDescriptionChange}
        tone={aiTone}
        onToneChange={onAiToneChange}
        isGenerating={isGenerating}
        error={aiError}
        onGenerate={onGenerate}
      />

      <Field label="Message template">
        <Textarea
          rows={5}
          value={messageText}
          onChange={(e) => onMessageTextChange(e.target.value)}
          className="font-mono"
        />
      </Field>
      <Button onClick={onSave} loading={isSaving}>
        {isSaving ? "Saving..." : "Save message"}
      </Button>
    </div>
  );
}
