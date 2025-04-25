import { useState } from 'react';
import { DatePicker } from '@/components/ui/date-picker';

/**
 * DateRangePicker - A reusable date range picker for dashboard analytics filters.
 * Props:
 * - value: { start: Date | null; end: Date | null }
 * - onChange: (value: { start: Date | null; end: Date | null }) => void
 * - presets?: { label: string; range: { start: Date; end: Date } }[]
 */
export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  presets?: { label: string; range: DateRange }[];
}

export function DateRangePicker({ value, onChange, presets }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2">
      <DatePicker
        selected={value.start}
        onSelect={(date: Date | undefined) => onChange({ start: date ?? null, end: value.end })}
        placeholder="Start date"
      />
      <span className="mx-1">-</span>
      <DatePicker
        selected={value.end}
        onSelect={(date: Date | undefined) => onChange({ start: value.start, end: date ?? null })}
        placeholder="End date"
      />
      {presets && presets.length > 0 && (
        <select
          className="ml-2 border rounded px-2 py-1 text-sm"
          onChange={e => {
            const preset = presets[parseInt(e.target.value, 10)];
            if (preset) onChange(preset.range);
          }}
        >
          <option value="">Presets</option>
          {presets.map((p, i) => (
            <option key={i} value={i}>{p.label}</option>
          ))}
        </select>
      )}
    </div>
  );
} 