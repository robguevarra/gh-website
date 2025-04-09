"use client"
import Image from "next/image"
import Link from "next/link"
import { ExternalLink, ShoppingBag } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Purchase {
  id: string
  date: string
  items: {
    name: string
    price: number
    image: string
  }[]
  total: number
  status: string
}

interface RecentPurchasesProps {
  purchases: Purchase[]
}

export function RecentPurchases({ purchases }: RecentPurchasesProps) {
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount / 100)
  }

  return (
    <Card className="border-none shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recent Purchases</CardTitle>
        <Link href="/dashboard/purchases" className="text-sm text-brand-purple hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {purchases.length > 0 ? (
          purchases.map((purchase) => (
            <div key={purchase.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Order #{purchase.id}</div>
                <Badge variant={purchase.status === "delivered" ? "outline" : "secondary"}>
                  {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">{formatDate(purchase.date)}</div>

              <div className="space-y-2">
                {purchase.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-md overflow-hidden relative flex-shrink-0">
                      <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{formatCurrency(item.price)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="font-medium">Total: {formatCurrency(purchase.total)}</div>
                <Button variant="ghost" size="sm" className="text-xs">
                  <ShoppingBag className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6">
            <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No purchases yet</p>
            <Button variant="outline" className="mt-2" asChild>
              <Link href="/shop">
                Browse Shop
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        )}

        <div className="pt-2">
          <Button variant="outline" className="w-full" asChild>
            <Link href="https://gracefulhomeschooling.com/shop" target="_blank">
              Visit Our Shop
              <ExternalLink className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
