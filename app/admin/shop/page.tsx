import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ProductDriveMappingTable } from '@/components/admin/product-drive-mapping-table';
import { ProductDriveMappingSkeleton } from '@/components/admin/product-drive-mapping-skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Metadata } from 'next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Shop Integration | Admin',
  description: 'Manage Shopify product integrations',
};

/**
 * Fetches all products from the shopify_products table
 */
async function getShopifyProducts() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('shopify_products')
    .select(`
      id,
      shopify_product_id,
      title,
      handle,
      status,
      product_type,
      featured_image_url,
      google_drive_file_id,
      tags,
      vendor
    `)
    .order('title');

  if (error) {
    console.error('Error fetching products:', error);
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return data || [];
}

// Product data fetching component with error handling
async function ProductsData() {
  try {
    const products = await getShopifyProducts();
    return <ProductDriveMappingTable products={products} />;
  } catch (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load products: {error instanceof Error ? error.message : String(error)}
        </AlertDescription>
      </Alert>
    );
  }
}

export default function ShopAdminPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shop Integration</h1>
        <p className="text-muted-foreground">
          Manage Shopify product integrations and Google Drive mappings
        </p>
      </div>

      <Tabs defaultValue="drive-mapping" className="w-full">
        <TabsList>
          <TabsTrigger value="drive-mapping">Google Drive Mapping</TabsTrigger>
          <TabsTrigger value="settings">Shop Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="drive-mapping" className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg border mb-6">
            <h2 className="font-medium mb-2">Google Drive Mapping Instructions</h2>
            <p className="text-sm text-muted-foreground mb-2">
              Link Shopify products to Google Drive folders to grant access after purchase:
            </p>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li>Find the Google Drive folder containing product resources</li>
              <li>Copy the folder ID from the URL (e.g., from <code className="text-xs bg-muted p-1 rounded">https://drive.google.com/drive/folders/<span className="text-primary">1AbCdEfGhIjKlMnOpQrStUvWxYz12345</span></code>)</li>
              <li>Paste the ID or full URL in the Google Drive ID field</li>
              <li>Click Save to update the mapping</li>
            </ol>
          </div>

          <Suspense fallback={<ProductDriveMappingSkeleton />}>
            <ProductsData />
          </Suspense>
        </TabsContent>

        <TabsContent value="settings">
          <div className="bg-muted/50 p-4 rounded-lg border">
            <h2 className="font-medium">Shop Settings</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Shop settings will be implemented in a future update.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
