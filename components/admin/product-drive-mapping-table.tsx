'use client';

import { useState } from 'react';
import { updateProductDriveId, extractGoogleDriveId } from '@/app/actions/updateProductDriveId';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Search, Save, Copy, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import Image from 'next/image';

// Type for a Shopify product
interface ShopifyProduct {
  id: string;
  shopify_product_id: number;
  title: string;
  handle: string;
  status: string;
  product_type: string;
  featured_image_url: string | null;
  google_drive_file_id: string | null;
  tags: string[] | null;
}

interface ProductDriveMappingTableProps {
  products: ShopifyProduct[];
}

export function ProductDriveMappingTable({ products }: ProductDriveMappingTableProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [driveIdInputs, setDriveIdInputs] = useState<Record<string, string>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  
  // Filter products based on search query
  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.title?.toLowerCase().includes(query) ||
      product.handle?.toLowerCase().includes(query) ||
      product.product_type?.toLowerCase().includes(query)
    );
  });
  
  // Start editing a product's Drive ID
  const startEditing = (product: ShopifyProduct) => {
    setEditingId(product.id);
    setDriveIdInputs({
      ...driveIdInputs,
      [product.id]: product.google_drive_file_id || ''
    });
  };
  
  // Update Drive ID input for a product
  const updateDriveIdInput = (productId: string, value: string) => {
    setDriveIdInputs({
      ...driveIdInputs,
      [productId]: value
    });
  };
  
  // Save Drive ID for a product
  const saveDriveId = async (productId: string) => {
    const driveId = driveIdInputs[productId] || '';
    
    // Set loading state
    setLoadingStates({ ...loadingStates, [productId]: true });
    
    try {
      const result = await updateProductDriveId(productId, driveId);
      
      if (result.success) {
        toast({
          title: 'Drive ID Updated',
          description: `Successfully updated Google Drive ID to: ${result.parsedId}`,
          variant: 'default',
        });
        
        // Update the UI to show the parsed ID
        const updatedProducts = products.map(p => {
          if (p.id === productId) {
            return { ...p, google_drive_file_id: result.parsedId };
          }
          return p;
        });
        
        // Reset editing state
        setEditingId(null);
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to update Drive ID: ${error instanceof Error ? error.message : String(error)}`,
        variant: 'destructive',
      });
    } finally {
      // Clear loading state
      setLoadingStates({ ...loadingStates, [productId]: false });
    }
  };
  
  // Copy Drive ID to clipboard
  const copyDriveId = (driveId: string) => {
    navigator.clipboard.writeText(driveId);
    toast({
      title: 'Copied',
      description: 'Google Drive ID copied to clipboard',
      variant: 'default',
    });
  };
  
  // Open the Google Drive folder in a new tab
  const openDriveFolder = (driveId: string) => {
    window.open(`https://drive.google.com/drive/folders/${driveId}`, '_blank');
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products by name or SKU..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Image</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-[300px]">Google Drive ID</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.featured_image_url ? (
                      <div className="relative h-10 w-10 rounded-md overflow-hidden">
                        <Image
                          src={product.featured_image_url}
                          alt={product.title || 'Product image'}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        No img
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{product.title}</div>
                    <div className="text-xs text-muted-foreground">{product.handle}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{product.product_type}</TableCell>
                  <TableCell>
                    {editingId === product.id ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          value={driveIdInputs[product.id] || ''}
                          onChange={(e) => updateDriveIdInput(product.id, e.target.value)}
                          placeholder="Enter Drive ID or URL..."
                          className="text-xs"
                        />
                        <Button
                          size="sm"
                          onClick={() => saveDriveId(product.id)}
                          disabled={loadingStates[product.id]}
                        >
                          {loadingStates[product.id] ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <code className="text-xs bg-muted p-1 rounded truncate max-w-[200px]">
                          {product.google_drive_file_id || 'Not set'}
                        </code>
                        {product.google_drive_file_id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => copyDriveId(product.google_drive_file_id!)}
                            title="Copy Drive ID"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(product)}
                      >
                        Edit
                      </Button>
                      
                      {product.google_drive_file_id && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => openDriveFolder(product.google_drive_file_id!)}
                          title="Open in Google Drive"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="text-xs text-muted-foreground">
        <p>
          <strong>Note:</strong> You can enter either a Google Drive ID or a full URL. 
          The system will automatically extract the ID from URLs.
        </p>
      </div>
    </div>
  );
}
