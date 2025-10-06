'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export type InsightsClientProps = Record<string, never>;

const toISOStringOrNull = (d?: Date) => (d ? d.toISOString() : null);

const toDisplayDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '');

export function InsightsClient(_props: InsightsClientProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [channelsText, setChannelsText] = useState('facebook');
  const [prompt, setPrompt] = useState<string>('Provide a concise performance summary with actionable recommendations.');

  const [isGenerating, setIsGenerating] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [insights, setInsights] = useState<any[]>([]);

  const filters = useMemo(() => ({
    startDate: toISOStringOrNull(dateRange?.from),
    endDate: toISOStringOrNull(dateRange?.to),
    channels: channelsText.split(',').map(s => s.trim()).filter(Boolean),
  }), [dateRange, channelsText]);

  const fetchInsights = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch('/api/admin/marketing/insights?limit=20&offset=0', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load insights');
      setInsights(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setListError(e?.message || 'Failed to load insights');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const onGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/marketing/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: filters.startDate,
          endDate: filters.endDate,
          channels: filters.channels,
          prompt,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to generate insight');
      await fetchInsights();
    } catch (e) {
      // Surface minimal error. In production, wire to a toast.
      alert((e as any)?.message || 'Failed to generate insight');
    } finally {
      setIsGenerating(false);
    }
  }, [filters, prompt, fetchInsights]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Insight</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Date Range</label>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Channels (comma-separated)</label>
              <Input value={channelsText} onChange={(e) => setChannelsText(e.target.value)} placeholder="facebook, organic" />
            </div>
            <div className="md:justify-self-end">
              <Button onClick={onGenerate} disabled={isGenerating}>
                {isGenerating ? 'Generating…' : 'Generate Insight'}
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Prompt (optional)</label>
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Output (preview)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                </TableRow>
              ))}
              {!listLoading && listError && (
                <TableRow>
                  <TableCell colSpan={5} className="text-red-600">{listError}</TableCell>
                </TableRow>
              )}
              {!listLoading && !listError && insights.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center">No insights yet.</TableCell>
                </TableRow>
              )}
              {!listLoading && !listError && insights.map((row) => {
                const channels = Array.isArray(row?.filters?.channels) ? row.filters.channels.join(', ') : '';
                const output = typeof row?.output === 'string' ? row.output : JSON.stringify(row?.output);
                return (
                  <TableRow key={row.id}>
                    <TableCell>{toDisplayDate(row.created_at)}</TableCell>
                    <TableCell>{channels}</TableCell>
                    <TableCell>{row.model ?? '-'}</TableCell>
                    <TableCell>{row.status ?? '-'}</TableCell>
                    <TableCell className="max-w-[28rem] truncate" title={output}>{output}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
