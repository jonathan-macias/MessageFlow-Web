import { Field, Input, Select } from "@/components/ui/field";
import { TIMEZONES } from "./constants";

interface ScheduleFieldsProps {
  idPrefix: string;
  labelSize?: "md" | "sm";
  scheduleType: number;
  onScheduleTypeChange: (value: number) => void;
  timeZone: string;
  onTimeZoneChange: (value: string) => void;
  runAtUtc: string;
  onRunAtUtcChange: (value: string) => void;
  recurrenceTimeOfDay: string;
  onRecurrenceTimeOfDayChange: (value: string) => void;
  recurrenceIntervalDays: string;
  onRecurrenceIntervalDaysChange: (value: string) => void;
}

/** Campos de programación de un flow (tipo de ejecución, zona horaria, fecha o recurrencia). */
export function ScheduleFields({
  idPrefix,
  labelSize = "md",
  scheduleType,
  onScheduleTypeChange,
  timeZone,
  onTimeZoneChange,
  runAtUtc,
  onRunAtUtcChange,
  recurrenceTimeOfDay,
  onRecurrenceTimeOfDayChange,
  recurrenceIntervalDays,
  onRecurrenceIntervalDaysChange,
}: ScheduleFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Execution type" labelSize={labelSize}>
          <Select
            id={`${idPrefix}-type`}
            value={scheduleType}
            onChange={(e) => onScheduleTypeChange(Number(e.target.value))}
          >
            <option value={1}>OneTime</option>
            <option value={2}>Recurring</option>
            <option value={3}>DataTriggered</option>
            <option value={4}>Immediate</option>
          </Select>
        </Field>
        <Field label="Time zone" labelSize={labelSize}>
          <Select id={`${idPrefix}-tz`} value={timeZone} onChange={(e) => onTimeZoneChange(e.target.value)}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {scheduleType === 1 && (
        <Field label="Run date and time" labelSize={labelSize}>
          <Input
            id={`${idPrefix}-runat`}
            type="datetime-local"
            value={runAtUtc}
            onChange={(e) => onRunAtUtcChange(e.target.value)}
          />
        </Field>
      )}

      {scheduleType === 2 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Time of day" labelSize={labelSize}>
            <Input
              id={`${idPrefix}-rec-time`}
              type="time"
              value={recurrenceTimeOfDay}
              onChange={(e) => onRecurrenceTimeOfDayChange(e.target.value)}
            />
          </Field>
          <Field label="Interval (days)" labelSize={labelSize}>
            <Input
              id={`${idPrefix}-rec-interval`}
              type="number"
              min={1}
              value={recurrenceIntervalDays}
              onChange={(e) => onRecurrenceIntervalDaysChange(e.target.value)}
            />
          </Field>
        </div>
      )}
    </>
  );
}
