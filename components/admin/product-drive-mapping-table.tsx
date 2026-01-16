'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaginatedProductTable, ShopifyProduct } from './paginated-product-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProductDriveMappingTableProps {
  products: ShopifyProduct[];
}

export function ProductDriveMappingTable({ products }: ProductDriveMappingTableProps) {

  // Categorize products by vendor
  const studentProducts = products.filter(p => p.vendor === 'Graceful Publications');
  const publicProducts = products.filter(p => p.vendor === 'Graceful Resources');
  const otherProducts = products.filter(p => p.vendor !== 'Graceful Publications' && p.vendor !== 'Graceful Resources');

  return (
    <Card className="w-full border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg">Product Management</CardTitle>
        <CardDescription>
          Organized by Shop Vendor. Select a tab to manage products for that specific shop.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Tabs defaultValue="student" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="student">
              Student Shop ({studentProducts.length})
            </TabsTrigger>
            <TabsTrigger value="public">
              Public Shop ({publicProducts.length})
            </TabsTrigger>
            {otherProducts.length > 0 && (
              <TabsTrigger value="other">
                Other ({otherProducts.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="student">
            <PaginatedProductTable products={studentProducts} />
          </TabsContent>

          <TabsContent value="public">
            <PaginatedProductTable products={publicProducts} />
          </TabsContent>

          {otherProducts.length > 0 && (
            <TabsContent value="other">
              <PaginatedProductTable products={otherProducts} />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
