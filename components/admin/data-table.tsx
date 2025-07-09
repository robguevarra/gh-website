import { ReactNode } from 'react';
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from '@/components/ui/table';

/**
 * DataTable - A generic, reusable table for dashboard analytics.
 * Props:
 * - columns: { header: string; accessor: string }[]
 * - data: Record<string, any>[]
 * - emptyState?: ReactNode (optional message when no data)
 */
export interface DataTableColumn {
  header: string;
  accessor: string;
}

export interface DataTableProps {
  columns: DataTableColumn[];
  data: Record<string, any>[];
  emptyState?: ReactNode;
}

export function DataTable({ columns, data, emptyState }: DataTableProps) {
  return (
    <div className="relative w-full overflow-x-auto">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.accessor} className="whitespace-nowrap">{col.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                {emptyState || 'No data available.'}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.accessor} className="whitespace-nowrap">{row[col.accessor]}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
} 