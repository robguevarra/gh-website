"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { ShoppingBag, Heart, ChevronLeft, ChevronRight, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Mock data for Shopify products
const shopifyProducts = [
  {
    id: "prod-1",
    title: "Digital Planner Bundle",
    price: 2499,
    compareAtPrice: 3999,
    image: "/placeholder.svg?height=300&width=300&text=Planner+Bundle",
    rating: 4.9,
    reviewCount: 124,
    tags: ["bestseller"],
    available: true,
  },
  {
    id: "prod-2",
    title: "Homeschool Curriculum Planner",
    price: 1999,
    compareAtPrice: 2499,
    image: "/placeholder.svg?height=300&width=300&text=Curriculum+Planner",
    rating: 4.8,
    reviewCount: 86,
    tags: ["new"],
    available: true,
  },
  {
    id: "prod-3",
    title: "Journal Making Kit",
    price: 3499,
    compareAtPrice: null,
    image: "/placeholder.svg?height=300&width=300&text=Journal+Kit",
    rating: 4.7,
    reviewCount: 52,
    tags: [],
    available: true,
  },
  {
    id: "prod-4",
    title: "Printable Worksheet Collection",
    price: 1499,
    compareAtPrice: 1999,
    image: "/placeholder.svg?height=300&width=300&text=Worksheets",
    rating: 4.6,
    reviewCount: 38,
    tags: [],
    available: true,
  },
  {
    id: "prod-5",
    title: "Binding Tools Set",
    price: 4999,
    compareAtPrice: null,
    image: "/placeholder.svg?height=300&width=300&text=Binding+Tools",
    rating: 4.8,
    reviewCount: 29,
    tags: ["limited"],
    available: false,
  },
  {
    id: "prod-6",
    title: "Homeschool Record Keeper",
    price: 1799,
    compareAtPrice: 2299,
    image: "/placeholder.svg?height=300&width=300&text=Record+Keeper",
    rating: 4.7,
    reviewCount: 45,
    tags: [],
    available: true,
  },
]

export function ShopifyProducts() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const productsPerPage = 3
  const totalPages = Math.ceil(shopifyProducts.length / productsPerPage)

  const nextSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex + productsPerPage >= shopifyProducts.length ? 0 : prevIndex + productsPerPage,
    )
  }

  const prevSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex - productsPerPage < 0
        ? Math.max(0, shopifyProducts.length - productsPerPage)
        : prevIndex - productsPerPage,
    )
  }

  const currentProducts = shopifyProducts.slice(currentIndex, currentIndex + productsPerPage)

  // Format price to currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(price / 100)
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  }

  return (
    <div className="relative">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {currentProducts.map((product) => (
          <motion.div key={product.id} variants={itemVariants} whileHover={{ y: -10 }}>
            <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 h-full">
              <div className="relative h-64">
                <Image
                  src={product.image || "/placeholder.svg"}
                  alt={product.title}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-105"
                />
                {product.tags.includes("bestseller") && (
                  <Badge className="absolute top-2 left-2 bg-amber-500 text-white border-none">Bestseller</Badge>
                )}
                {product.tags.includes("new") && (
                  <Badge className="absolute top-2 left-2 bg-green-500 text-white border-none">New</Badge>
                )}
                {product.tags.includes("limited") && (
                  <Badge className="absolute top-2 left-2 bg-red-500 text-white border-none">Limited</Badge>
                )}
                {!product.available && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Badge className="bg-white text-black border-none text-lg px-4 py-2">Sold Out</Badge>
                  </div>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm hover:bg-white text-brand-pink rounded-full h-8 w-8"
                >
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg line-clamp-1">{product.title}</CardTitle>
                <div className="flex items-center text-sm">
                  <div className="flex items-center text-amber-500">
                    <Star className="h-3 w-3 fill-amber-500" />
                    <span className="ml-1 font-medium">{product.rating}</span>
                  </div>
                  <span className="mx-1 text-gray-400">•</span>
                  <span className="text-gray-500">{product.reviewCount} reviews</span>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-brand-purple">{formatPrice(product.price)}</span>
                  {product.compareAtPrice && (
                    <span className="text-sm text-gray-500 line-through">{formatPrice(product.compareAtPrice)}</span>
                  )}
                  {product.compareAtPrice && (
                    <Badge className="bg-brand-pink/10 text-brand-pink border-brand-pink/20">
                      {Math.round((1 - product.price / product.compareAtPrice) * 100)}% OFF
                    </Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-brand-purple hover:bg-brand-purple/90" disabled={!product.available}>
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  {product.available ? "Add to Cart" : "Sold Out"}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Navigation Controls */}
      <div className="flex justify-between mt-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={prevSlide}
            className="rounded-full h-10 w-10 border-brand-purple/20 text-brand-purple hover:bg-brand-purple/10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextSlide}
            className="rounded-full h-10 w-10 border-brand-purple/20 text-brand-purple hover:bg-brand-purple/10"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <Link href="/dashboard/shop" target="_blank">
          <Button className="bg-brand-purple hover:bg-brand-purple/90">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Visit Shop
          </Button>
        </Link>
      </div>
    </div>
  )
}
