"use client"

import Link from "next/link"
import Image from "next/image"
import { Download, ExternalLink, ShoppingBag, ChevronDown, ChevronUp } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface PurchaseItem {
  name: string
  price: number
  image: string
}

export interface Purchase {
  id: string
  date: string
  items: PurchaseItem[]
  total: number
  status: string
}

export interface PurchasesSectionProps {
  recentPurchases: Purchase[]
  isSectionExpanded: (section: string) => boolean
  toggleSection: (section: string) => void
}

export function PurchasesSection({
  recentPurchases,
  isSectionExpanded,
  toggleSection
}: PurchasesSectionProps) {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  const handleDownload = (purchaseId: string) => {
    // Placeholder for receipt download functionality
    // Will be implemented in the Shopify integration phase
    console.log(`Downloading receipt for purchase ${purchaseId}`)
  }

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
              <Link
                href="https://gracefulhomeschooling.myshopify.com"
                target="_blank"
                className="text-green-600 hover:underline text-sm flex items-center"
              >
                Visit Shop
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </div>

            {recentPurchases.length > 0 ? (
              <div className="space-y-4">
                {recentPurchases.map((purchase) => (
                  <div key={purchase.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Order #{purchase.id}</div>
                      <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                        {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{purchase.date}</div>

                    <div className="space-y-2">
                      {purchase.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-md overflow-hidden relative flex-shrink-0">
                            <Image
                              src={item.image || "/placeholder.svg"}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm line-clamp-1">{item.name}</div>
                            <div className="text-xs text-muted-foreground">
                              ₱{(item.price / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="font-medium">Total: ₱{(purchase.total / 100).toFixed(2)}</div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => handleDownload(purchase.id)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No purchases yet</p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link href="https://gracefulhomeschooling.myshopify.com" target="_blank">
                    Browse Shop
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            )}

            <div className="mt-4 pt-4 border-t text-center md:hidden">
              <Link
                href="https://gracefulhomeschooling.myshopify.com"
                target="_blank"
                className="text-green-600 hover:underline text-sm flex items-center justify-center"
              >
                Visit Shop
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
