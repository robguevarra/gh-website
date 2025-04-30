'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronDown, ChevronUp, DownloadCloud, ImageIcon, AlertCircle, Folder } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Re-define types here or import from a shared types file if available
interface UnifiedOrderItem {
  id: string; 
  product_id: string | null; 
  title: string | null;
  variant_title?: string | null; 
  quantity: number;
  price_at_purchase: number;
  image_url: string | null; 
  google_drive_file_id?: string | null; 
  source: 'ecommerce' | 'shopify'; 
}

interface UnifiedPurchase {
  id: string; 
  order_number: string | null; 
  created_at: string;
  order_status: string | null; 
  total_amount: number | null; 
  currency: string | null;
  items: UnifiedOrderItem[];
  source: 'ecommerce' | 'shopify'; 
}

interface PurchaseHistoryListProps {
  purchases: UnifiedPurchase[];
}

// Function to get status color (copied from page.tsx for now, consider moving to utils)
const getStatusClass = (status: string | null): string => {
    switch (status?.toLowerCase()) {
        case 'completed':
        case 'delivered':
        return 'text-green-700 bg-green-100'; 
        case 'shipped':
        case 'paid': 
        case 'processing':
        return 'text-brand-purple bg-brand-purple/10'; 
        case 'refunded':
        case 'cancelled':
        return 'text-orange-600 bg-orange-100'; 
        default:
        return 'text-gray-600 bg-gray-100'; 
    }
};

const HIDE_GDRIVE_MODAL_KEY = 'hideGoogleDriveRedirectModal';

export function PurchaseHistoryList({ purchases }: PurchaseHistoryListProps) {
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [hideModalPreference, setHideModalPreference] = useState<boolean | null>(null);

  useEffect(() => {
    const preference = localStorage.getItem(HIDE_GDRIVE_MODAL_KEY);
    setHideModalPreference(preference === 'true');
  }, []);

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const handleOpenFolder = (url: string) => {
      window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDialogContinue = (url: string) => {
    if (dontShowAgain) {
      localStorage.setItem(HIDE_GDRIVE_MODAL_KEY, 'true');
      setHideModalPreference(true);
    }
    handleOpenFolder(url);
  };

  const handleDialogTriggerClick = () => {
    setDontShowAgain(false);
  };

  const renderAccessControl = (item: UnifiedOrderItem) => {
    if (!item.google_drive_file_id) {
      return (
        <Button
          variant="outline"
          size="sm"
          disabled
          className="cursor-not-allowed opacity-60"
          aria-disabled="true"
        >
          <Folder className="h-4 w-4 mr-2" />
          Open Folder
        </Button>
      );
    }

    const driveUrl = `https://drive.google.com/drive/folders/${item.google_drive_file_id}`;

    if (hideModalPreference === true) {
      return (
        <Button variant="outline" size="sm" asChild>
          <Link href={driveUrl} target="_blank" rel="noopener noreferrer">
            <Folder className="h-4 w-4 mr-2" />
            Open Folder
          </Link>
        </Button>
      );
    }

    if (hideModalPreference === null) {
        return (
             <Button variant="outline" size="sm" disabled>
                <Folder className="h-4 w-4 mr-2" />
                Loading...
            </Button>
        );
    }

    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" onClick={handleDialogTriggerClick}>
            <Folder className="h-4 w-4 mr-2" />
            Open Folder
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Open Google Drive Folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will open the Google Drive folder containing your purchased files in a new browser tab. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-2 my-4">
             <Checkbox 
                id={`dont-show-again-${item.id}`} 
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(Boolean(checked))}
             />
            <Label 
                htmlFor={`dont-show-again-${item.id}`}
                className="text-sm font-normal text-muted-foreground cursor-pointer"
             >
              Don't show this message again
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDialogContinue(driveUrl)}>
              Continue to Google Drive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  return (
    <div className="space-y-4">
      {purchases.map((purchase) => {
        const isExpanded = expandedOrders[purchase.id] || false;
        const orderKey = `${purchase.source}-${purchase.id}`;

        return (
          <div key={orderKey} className="border border-slate-200 rounded-lg overflow-hidden transition-shadow duration-200 ease-in-out hover:shadow-md">
            {/* Order Summary Row - Clickable Header */}
            <div 
              className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4 p-4 bg-slate-50/50 cursor-pointer"
              onClick={() => toggleOrderExpansion(purchase.id)}
              aria-expanded={isExpanded}
              aria-controls={`items-${orderKey}`}
            >
              {/* Left Side: Order Info */}
              <div className="flex-grow">
                <p className="text-base font-semibold text-gray-800">
                  Order #{purchase.order_number || purchase.id.substring(0, 8)}
                  <span className="ml-2 text-xs font-medium py-0.5 px-1.5 rounded bg-brand-blue/10 text-brand-blue align-middle">
                    {purchase.source === 'shopify' ? 'Shopify' : 'Website'}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Placed on {new Date(purchase.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Right Side: Status & Total */}
              <div className="flex sm:flex-col items-end sm:items-end gap-3 sm:gap-1 flex-shrink-0">
                 <p className={`text-xs font-bold uppercase tracking-wider py-1 px-2.5 rounded-full inline-block order-2 sm:order-1 ${getStatusClass(purchase.order_status)}`}>
                    {purchase.order_status || 'Unknown'}
                  </p>
                 <p className="text-base font-semibold text-gray-800 order-1 sm:order-2">
                   {purchase.total_amount !== null && purchase.currency ? 
                     formatPrice(purchase.total_amount, purchase.currency) : 'N/A'}
                 </p>
              </div>

              {/* Expand/Collapse Icon */}
              <div className="hidden sm:block flex-shrink-0 ml-2">
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
              </div>
            </div>

            {/* Expanded Item Details */}
            {isExpanded && (
              <div id={`items-${orderKey}`} className="p-4 border-t border-slate-200 bg-white">
                 <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Items ({purchase.items?.length ?? 0})</h4>
                 {purchase.items && purchase.items.length > 0 ? (
                    <div className="space-y-4">
                    {purchase.items.map((item) => (
                        <div key={`${item.source}-${item.id}`} className="flex items-start gap-4 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                            {/* Image */}
                            <div className="relative h-16 w-16 bg-brand-pink/10 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center border border-brand-pink/20">
                                {item.image_url ? (
                                <Image 
                                    src={item.image_url}
                                    alt={item.title || 'Product image'}
                                    fill
                                    style={{ objectFit: 'cover' }}
                                    sizes="64px"
                                    // Add error handling for image loading failures
                                    onError={(e) => {
                                        console.log(`Image load error for ${item.title}`);
                                        // Replace with fallback icon when image fails to load
                                        e.currentTarget.style.display = 'none';
                                        // We can't directly add the icon here, but we can trigger the fallback
                                    }}
                                />
                                ) : (
                                <ImageIcon className="h-7 w-7 text-brand-pink/50" aria-label="No image available"/>
                                )}
                            </div>
                            {/* Details */}
                            <div className="flex-grow">
                                <p className="font-medium text-sm text-gray-800">
                                {item.title || 'Product title unavailable'}
                                {item.source === 'shopify' && item.variant_title && (
                                    <span className="text-xs text-muted-foreground block">({item.variant_title})</span>
                                )}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                Qty: {item.quantity} | {formatPrice(item.price_at_purchase, purchase.currency || 'PHP')}
                                </p>
                            </div>
                            {/* Access Button / Link */}
                             <div className="flex-shrink-0 self-center ml-auto">
                                {renderAccessControl(item)}
                            </div>
                        </div>
                    ))}
                    </div>
                 ) : (
                     <p className="text-sm text-muted-foreground">No items found for this order.</p>
                 )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
} 