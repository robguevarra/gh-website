// components/admin/email-analytics-filters.tsx
// Filter controls for the email analytics dashboard (date range, event type)

import React from 'react';

export type EmailAnalyticsFilters = {
  dateFrom: string;
  dateTo: string;
  eventType: string;
};

export type EmailAnalyticsFiltersProps = {
  filters: EmailAnalyticsFilters;
  onChange: (filters: EmailAnalyticsFilters) => void;
};

export function EmailAnalyticsFilters({ filters, onChange }: EmailAnalyticsFiltersProps) {
  return (
    <form className="flex flex-wrap gap-4 items-end mb-4" onSubmit={e => e.preventDefault()}>
      <div>
        <label className="block text-xs mb-1">From</label>
        <input
          type="date"
          className="input input-bordered"
          value={filters.dateFrom}
          max={filters.dateTo}
          onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-xs mb-1">To</label>
        <input
          type="date"
          className="input input-bordered"
          value={filters.dateTo}
          min={filters.dateFrom}
          onChange={e => onChange({ ...filters, dateTo: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-xs mb-1">Event</label>
        <select
          className="select select-bordered"
          value={filters.eventType}
          onChange={e => onChange({ ...filters, eventType: e.target.value })}
        >
          <option value="">All Events</option>
          <option value="delivered">Delivered</option>
          <option value="opened">Opened</option>
          <option value="clicked">Clicked</option>
          <option value="bounced">Bounced</option>
          <option value="spam_complaints">Spam Complaints</option>
        </select>
      </div>
    </form>
  );
}
