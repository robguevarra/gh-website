'use client';

import { useState } from 'react';
import { updateProductDriveId } from '@/app/actions/updateProductDriveId';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Search, Copy, ExternalLink, X, Filter } from 'lucide-react';
import Image from 'next/image';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { SimplePagination } from '@/components/ui/pagination';

// Type for a Shopify product
export interface ShopifyProduct {
    id: string;
    shopify_product_id: number;
    title: string | null;
    handle: string | null;
    status: string | null;
    product_type: string | null;
    featured_image_url: string | null;
    google_drive_file_id: string | null;
    tags: string[] | null;
    vendor: string | null;
}

interface PaginatedProductTableProps {
    products: ShopifyProduct[];
}

export function PaginatedProductTable({ products }: PaginatedProductTableProps) {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [mappingFilter, setMappingFilter] = useState('all'); // all, mapped, unmapped

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [editingId, setEditingId] = useState<string | null>(null);
    const [driveIdInputs, setDriveIdInputs] = useState<Record<string, string>>({});
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

    // Filter products
    const filteredProducts = products.filter(product => {
        // Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchTitle = product.title?.toLowerCase().includes(query);
            const matchHandle = product.handle?.toLowerCase().includes(query);
            const matchType = product.product_type?.toLowerCase().includes(query);
            if (!matchTitle && !matchHandle && !matchType) return false;
        }

        // Status Filter
        if (statusFilter !== 'all') {
            if (product.status?.toLowerCase() !== statusFilter.toLowerCase()) return false;
        }

        // Mapping Filter
        if (mappingFilter === 'mapped') {
            if (!product.google_drive_file_id) return false;
        } else if (mappingFilter === 'unmapped') {
            if (product.google_drive_file_id) return false;
        }

        return true;
    });

    // Calculate pages
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

    // Get current page items
    const currentProducts = filteredProducts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const resetFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setMappingFilter('all');
        setCurrentPage(1);
    };

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

                // Update the item in the local list (mutation) or trigger re-fetch
                // For simplicity, we mutate the prop array in memory or we'd typically need a router refresh
                // But since we are passing props, we can't easily mutate the prop in a way that React sees 
                // without parent state. However, let's just update the value in specific product object reference 
                // to reflect immediate change, though a standardized revalidation is better.
                // Actually best to just let the user reload or rely on the toast for now as this is an Admin tool.
                // A better approach in client component: 

                // Let's manually update the product in our local "products" reference if strict immutability isn't enforced deeply
                // or just accept it won't update in UI until refresh.
                // To make it better:
                const prod = products.find(p => p.id === productId);
                if (prod) prod.google_drive_file_id = result.parsedId;

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
            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
                <div className="flex flex-1 items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search products..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1); // Reset page on search
                            }}
                        />
                    </div>

                    <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[130px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={mappingFilter} onValueChange={(val) => { setMappingFilter(val); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Mapping" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Mappings</SelectItem>
                            <SelectItem value="mapped">Mapped</SelectItem>
                            <SelectItem value="unmapped">Unmapped</SelectItem>
                        </SelectContent>
                    </Select>

                    {(searchQuery || statusFilter !== 'all' || mappingFilter !== 'all') && (
                        <Button variant="ghost" size="icon" onClick={resetFilters} title="Clear Filters">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <div className="text-sm text-muted-foreground whitespace-nowrap">
                    Showing {filteredProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                    {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length}
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">Image</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead className="w-[300px]">Google Drive ID</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No products found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            currentProducts.map((product) => (
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
                                        <Badge variant={product.status?.toLowerCase() === 'active' ? 'default' : 'secondary'}>
                                            {product.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-muted-foreground">{product.vendor || '-'}</span>
                                    </TableCell>
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

            <SimplePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />

            <div className="text-xs text-muted-foreground">
                <p>
                    <strong>Note:</strong> You can enter either a Google Drive ID or a full URL.
                    The system will automatically extract the ID from URLs.
                </p>
            </div>
        </div>
    );
}
