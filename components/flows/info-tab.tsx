import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { ChannelType } from "@/lib/types/flow";
import type { FlowDetail } from "@/lib/types/flow";
import { ScheduleFields } from "./schedule-fields";

interface InfoTabProps {
  flow: FlowDetail;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  scheduleType: number;
  onScheduleTypeChange: (value: number) => void;
  timeZone: string;
  onTimeZoneChange: (value: string) => void;
  runAtUtc: string;
  onRunAtUtcChange: (value: string) => void;
  recTimeOfDay: string;
  onRecTimeOfDayChange: (value: string) => void;
  recIntervalDays: string;
  onRecIntervalDaysChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function InfoTab({
  flow,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  scheduleType,
  onScheduleTypeChange,
  timeZone,
  onTimeZoneChange,
  runAtUtc,
  onRunAtUtcChange,
  recTimeOfDay,
  onRecTimeOfDayChange,
  recIntervalDays,
  onRecIntervalDaysChange,
  onSave,
  isSaving,
}: InfoTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <Card className="p-3">
          <p className="text-subtle">Channel</p>
          <p className="font-medium text-fg">{ChannelType[flow.channel] ?? flow.channel}</p>
        </Card>
        <Card className="p-3">
          <p className="text-subtle">Created</p>
          <p className="font-medium text-fg">{new Date(flow.createdAtUtc).toLocaleDateString("en-US")}</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-fg">Name and description</h3>
        <Field label="Name" labelSize="sm">
          <Input type="text" value={name} onChange={(e) => onNameChange(e.target.value)} />
        </Field>
        <Field label="Description" labelSize="sm">
          <Input type="text" value={description} onChange={(e) => onDescriptionChange(e.target.value)} />
        </Field>
      </Card>

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-fg">Scheduling</h3>
        <ScheduleFields
          idPrefix="edit"
          labelSize="sm"
          scheduleType={scheduleType}
          onScheduleTypeChange={onScheduleTypeChange}
          timeZone={timeZone}
          onTimeZoneChange={onTimeZoneChange}
          runAtUtc={runAtUtc}
          onRunAtUtcChange={onRunAtUtcChange}
          recurrenceTimeOfDay={recTimeOfDay}
          onRecurrenceTimeOfDayChange={onRecTimeOfDayChange}
          recurrenceIntervalDays={recIntervalDays}
          onRecurrenceIntervalDaysChange={onRecIntervalDaysChange}
        />
        <Button onClick={onSave} loading={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </Card>
    </div>
  );
}
