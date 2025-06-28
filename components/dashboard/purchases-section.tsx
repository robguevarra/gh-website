"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Download, ExternalLink, ShoppingBag, ChevronDown, ChevronUp, ChevronRight, Folder } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useStudentDashboardStore } from "@/lib/stores/student-dashboard"
import { useSectionExpansion } from "@/lib/hooks/use-dashboard-store"
import type { Purchase as StorePurchase, PurchaseItem as StorePurchaseItem } from "@/lib/services/purchaseHistory"

// Update interfaces to match the actual API data structure
export interface PurchaseItem {
  id?: string
  title: string
  price_at_purchase?: number
  price?: number
  image_url?: string
  google_drive_file_id?: string | null
  product_id?: string | null
  variant_title?: string | null
  quantity?: number
  source?: 'ecommerce' | 'shopify'
}

export interface Purchase {
  id: string
  order_number?: string | null
  created_at?: string
  date?: string // Legacy field for backward compatibility
  items: PurchaseItem[]
  total_amount?: number
  total?: number // Legacy field for backward compatibility
  order_status?: string
  status?: string // Legacy field for backward compatibility
  currency?: string | null
  source?: 'ecommerce' | 'shopify'
}

export interface PurchasesSectionProps {
  viewAllUrl?: string
  userId?: string | null
}

export function PurchasesSection({
  viewAllUrl = "/dashboard/purchase-history",
  userId
}: PurchasesSectionProps) {
  // Use direct Zustand selectors for better performance (avoid intermediate hooks)
  const recentPurchases = useStudentDashboardStore((state) => state.purchases || [])
  const isLoading = useStudentDashboardStore((state) => state.isLoadingPurchases)
  const hasPurchasesError = useStudentDashboardStore((state) => state.hasPurchasesError)
  
  // Get section expansion state from centralized store
  const { isSectionExpanded, toggleSection } = useSectionExpansion()
  
  // Note: Purchases are loaded by the dashboard's loadUserDashboardData function
  // This component only displays the data from the store
  // No need for separate useEffect to load purchases since dashboard handles it
  // Memoize animation variants to prevent recreation on each render
  const fadeInUp = useMemo(() => ({
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }), [])

  // Memoize event handler to prevent recreation on each render
  const handleOpenFolder = useCallback((googleDriveId: string | null | undefined) => {
    if (googleDriveId) {
      const driveUrl = `https://drive.google.com/drive/folders/${googleDriveId}`;
      window.open(driveUrl, '_blank', 'noopener,noreferrer');
    } else {
      console.log('No Google Drive link available for this item');
    }
  }, [])

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={{ delay: 0.2 }}>
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 h-full">
        {/* Section Header - Mobile Toggle */}
        <div
          className="md:hidden flex items-center justify-between p-4 cursor-pointer"
          onClick={() => toggleSection("purchases")}
        >
          <div className="flex items-center gap-2">
            <div className="bg-green-100 rounded-full p-2">
              <ShoppingBag className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-lg font-medium text-[#5d4037]">Recent Purchases</h2>
          </div>
          {isSectionExpanded("purchases") ? (
            <ChevronUp className="h-5 w-5 text-[#6d4c41]" />
          ) : (
            <ChevronDown className="h-5 w-5 text-[#6d4c41]" />
          )}
        </div>

        {/* Section Content */}
        <div className={`${isSectionExpanded("purchases") ? "block" : "hidden"} md:block`}>
          <div className="p-6 pt-0 md:pt-6">
            <div className="md:flex md:items-center md:justify-between mb-6 hidden">
              <div className="flex items-center gap-2">
                <div className="bg-green-100 rounded-full p-2">
                  <ShoppingBag className="h-5 w-5 text-green-600" />
                </div>
                <h2 className="text-xl font-medium text-[#5d4037]">Recent Purchases</h2>
              </div>
              <div className="flex items-center gap-3">
                {viewAllUrl && (
                  <Link
                    href={viewAllUrl}
                    className="text-green-600 hover:underline text-sm flex items-center"
                  >
                    View All
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                )}
                <Link
                  href="/dashboard/store"
                  className="text-green-600 hover:underline text-sm flex items-center"
                >
                  Visit Shop
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </div>

            {isLoading && recentPurchases.length === 0 ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={`skeleton-${i}`} className="border rounded-lg p-4 space-y-3 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-5 bg-green-100 rounded w-1/5"></div>
                    </div>
                    <div className="h-3 bg-gray-100 rounded w-1/3"></div>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-md bg-gray-200"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="h-4 bg-gray-200 rounded w-1/5"></div>
                      <div className="h-8 bg-gray-100 rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentPurchases.length > 0 ? (
              <div className="space-y-4">
                {/* Render purchases list - Using fragment to avoid key warning */}
              {recentPurchases.map((purchase: StorePurchase) => {
                // Format date string if it's ISO format - using pure function instead of hook
                const formattedDate = (() => {
                  try {
                    return new Date(purchase.created_at || '')
                      .toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      });
                  } catch (e) {
                    return 'N/A';
                  }
                })();
                
                // Format status with proper capitalization - using pure function instead of hook
                const formattedStatus = (() => {
                  const status = purchase.order_status || 'Processing';
                  return status.charAt(0).toUpperCase() + status.slice(1);
                })();
                
                // Calculate total with proper formatting - using pure function instead of hook
                const formattedTotal = (() => {
                  const amount = purchase.total_amount || 0;
                  return `₱${(amount).toFixed(2)}`;
                })();
                
                return (
                  <div key={purchase.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Order #{purchase.order_number || purchase.id.substring(0, 6)}</div>
                      <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                        {formattedStatus}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{formattedDate}</div>

                    <div className="space-y-3">
                      {purchase.items?.map((item: StorePurchaseItem, index: number) => {
                        // Format price with proper currency - using pure function instead of hook
                        const itemPrice = (() => {
                          // Use price_at_purchase as the primary source of price
                          // Fall back to the UI-specific price property if it exists
                          const price = item.price_at_purchase || (item as any).price || 0;
                          return `₱${(price).toFixed(2)}`;
                        })();
                        
                        return (
                          <div key={item.id || index} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-md overflow-hidden relative flex-shrink-0">
                                <Image
                                  src={item.image_url || "/placeholder.svg"}
                                  alt={item.title || 'Product image'}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm line-clamp-1">{item.title || 'Product'}</div>
                                <div className="text-xs text-muted-foreground">
                                  {itemPrice}
                                </div>
                              </div>
                            </div>
                            {item.google_drive_file_id && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs flex-shrink-0"
                                onClick={() => handleOpenFolder(item.google_drive_file_id)}
                              >
                                <Folder className="h-3 w-3 mr-1" />
                                Open Folder
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="font-medium">Total: {formattedTotal}</div>
                    </div>
                  </div>
                );
              })}
              </div>
            ) : (
              <div className="text-center py-12">
                <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No purchases yet</p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link href="/dashboard/store" target="_blank">
                    Browse Shop
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            )}

            <div className="mt-4 pt-4 border-t text-center md:hidden">
              <div className="flex flex-col gap-3">
                {viewAllUrl && (
                  <Link
                    href={viewAllUrl}
                    className="text-green-600 hover:underline text-sm flex items-center justify-center"
                  >
                    View All Purchases
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                )}
                <Link
                  href="/dashboard/store"
                  className="text-green-600 hover:underline text-sm flex items-center justify-center"
                >
                  Visit Shop
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
