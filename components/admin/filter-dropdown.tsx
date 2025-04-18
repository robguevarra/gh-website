import { ChangeEvent } from 'react';

/**
 * FilterDropdown - A reusable dropdown filter for dashboard analytics.
 * Props:
 * - label: string (dropdown label)
 * - options: { label: string; value: string }[]
 * - value: string
 * - onChange: (value: string) => void
 */
export interface FilterDropdownOption {
  label: string;
  value: string;
}

export interface FilterDropdownProps {
  label: string;
  options: FilterDropdownOption[];
  value: string;
  onChange: (value: string) => void;
}

export function FilterDropdown({ label, options, value, onChange }: FilterDropdownProps) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      {label}
      <select
        className="border rounded px-2 py-1 text-sm"
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
} 