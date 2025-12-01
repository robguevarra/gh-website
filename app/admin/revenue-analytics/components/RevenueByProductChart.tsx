import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const formatCurrency = (value: number, currency = 'PHP') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
};

interface ProductRevenue {
  product_identifier: string;
  product_name: string;
  source_platform: 'xendit' | 'shopify';
  total_revenue: number;
  units_sold: number;
  average_transaction_value: number;
}

interface Props {
  data?: ProductRevenue[];
  isLoading?: boolean;
}

type SortField = 'total_revenue' | 'units_sold' | 'product_name';
type SortDirection = 'asc' | 'desc';

const RevenueByProductChart: React.FC<Props> = ({ data, isLoading }) => {
  const [sortField, setSortField] = useState<SortField>('total_revenue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showZeroSales, setShowZeroSales] = useState(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = useMemo(() => {
    if (!data) return [];

    let filtered = data;
    if (!showZeroSales) {
      filtered = data.filter(item => item.total_revenue > 0);
    }

    return [...filtered].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;

      if (sortField === 'product_name') {
        return multiplier * (a.product_name || '').localeCompare(b.product_name || '');
      }

      return multiplier * ((a[sortField] || 0) - (b[sortField] || 0));
    });
  }, [data, sortField, sortDirection, showZeroSales]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortDirection === 'asc' ?
      <ArrowUp className="ml-2 h-4 w-4" /> :
      <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const renderSkeleton = () => (
    Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-4 w-24" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Revenue by Product</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowZeroSales(!showZeroSales)}
            className={showZeroSales ? "bg-secondary" : ""}
          >
            {showZeroSales ? "Hide Zero Sales" : "Show Zero Sales"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[400px]">
                  <Button variant="ghost" onClick={() => handleSort('product_name')} className="hover:bg-transparent pl-0 font-bold">
                    Product Name <SortIcon field="product_name" />
                  </Button>
                </TableHead>
                <TableHead>Platform</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => handleSort('total_revenue')} className="hover:bg-transparent pr-0 font-bold ml-auto">
                    Total Revenue <SortIcon field="total_revenue" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => handleSort('units_sold')} className="hover:bg-transparent pr-0 font-bold ml-auto">
                    Units Sold <SortIcon field="units_sold" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Avg. Revenue/Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && renderSkeleton()}

              {!isLoading && sortedData.length > 0 && sortedData.map((product) => {
                const key = `${product.source_platform}-${product.product_identifier || 'unknown'}`;
                const isZeroSale = product.total_revenue === 0;

                return (
                  <TableRow key={key} className={isZeroSale ? "opacity-60 bg-muted/20" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{product.product_name || 'Unknown Product'}</span>
                        {isZeroSale && <span className="text-xs text-muted-foreground italic">No sales in period</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {product.source_platform}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(product.total_revenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.units_sold}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(product.average_transaction_value)}
                    </TableCell>
                  </TableRow>
                );
              })}

              {!isLoading && sortedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No products found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueByProductChart; 