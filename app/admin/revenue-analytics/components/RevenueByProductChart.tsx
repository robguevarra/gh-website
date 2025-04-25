import React from 'react';
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
// Assuming formatCurrency is defined elsewhere or locally
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

const RevenueByProductChart: React.FC<Props> = ({ data, isLoading }) => {

  const renderSkeleton = () => (
    Array.from({ length: 3 }).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-4 w-12" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-4 w-20" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <Card className="col-span-1 lg:col-span-2"> {/* Allow it to span more width */}
      <CardHeader>
        <CardTitle>Revenue by Product</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead className="text-right">Total Revenue</TableHead>
              <TableHead className="text-right">Units Sold</TableHead>
              <TableHead className="text-right">Avg. Revenue/Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && renderSkeleton()}
            {!isLoading && data?.map((product) => {
              const key = `${product.source_platform}-${product.product_identifier || 'unknown_id'}-${product.product_name || 'unknown_name'}`;
              return (
                <TableRow key={key}>
                  <TableCell className="font-medium">{product.product_name || product.product_identifier || 'Unknown Product'}</TableCell>
                  <TableCell>{product.source_platform}</TableCell>
                  <TableCell className="text-right">{formatCurrency(product.total_revenue)}</TableCell>
                  <TableCell className="text-right">{product.units_sold}</TableCell>
                  <TableCell className="text-right">{formatCurrency(product.units_sold > 0 ? product.total_revenue / product.units_sold : 0)}</TableCell>
                </TableRow>
              );
            })}
            {!isLoading && data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No product revenue data available for the selected period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default RevenueByProductChart; 