import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicHeader } from '@/components/layout/public-header'
import { PublicFooter } from '@/components/layout/public-footer'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { formatPriceDisplayPHP } from '@/lib/utils/formatting'
import CheckoutClient from './checkout-client'
import PublicAddToCartButton from '@/components/store/PublicAddToCartButton'
import RelatedDesigns from '@/components/store/RelatedDesigns'

import { 
  Shield, 
  Download, 
  RefreshCw, 
  Clock, 
  Star, 
  Heart, 
  Users, 
  BookOpen,
  GraduationCap,
  Award,
  ChevronLeft,
  Eye,
  FileText,
  Target,
  CheckCircle2,
  Printer,
  Play,
  ImageIcon,
  Gift
} from 'lucide-react'

type ShopifyProductRow = Database['public']['Tables']['shopify_products']['Row']

type ProductWithVariant = ShopifyProductRow & {
  shopify_product_variants: { price: number | string | null; compare_at_price?: number | string | null }[]
}

async function getProductByHandle(handle: string): Promise<ProductWithVariant | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('shopify_products')
    .select(`
      id,
      title,
      handle,
      vendor,
      description_html,
      featured_image_url,
      image_urls,
      tags,
      google_drive_file_id,
      shopify_product_variants ( price, compare_at_price )
    `)
    .eq('handle', handle)
    .eq('vendor', 'Graceful Resources')
    .limit(1)
    .returns<ProductWithVariant[]>()

  if (error || !data || data.length === 0) return null
  return data[0]
}

export default async function PublicProductPage({ params }: { params: { handle: string } }) {
  const product = await getProductByHandle(params.handle)
  if (!product) return notFound()

  const primary = product.shopify_product_variants?.[0]
  const priceNum = typeof primary?.price === 'number' ? primary?.price : Number(primary?.price ?? 0)
  const compareNum = typeof primary?.compare_at_price === 'number' ? primary?.compare_at_price : (primary?.compare_at_price ? Number(primary?.compare_at_price) : undefined)
  const { formattedPrice, formattedCompareAtPrice } = formatPriceDisplayPHP({ price: priceNum, compareAtPrice: compareNum })
  const isOnSale = formattedCompareAtPrice != null

  // Fetch simple related products by excluding current and sharing any tag
  const supabase = await createServerSupabaseClient()
  const firstTag = Array.isArray(product.tags) && product.tags.length > 0 ? product.tags[0] : null
  let related: { id: string; handle: string | null; title: string | null; featured_image_url: string | null; image_urls: any; shopify_product_variants: { id: string; price: number | null }[] }[] = []
  if (firstTag) {
    const { data } = await supabase
      .from('shopify_products')
      .select('id, handle, title, vendor, featured_image_url, image_urls, shopify_product_variants ( id, price )')
      .neq('id', product.id)
      .filter('tags', 'cs', `{"${firstTag}"}`)
      .eq('vendor', 'Graceful Resources')
      .limit(4)
    related = (data as any) || []
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9f6f2] to-white">
      <PublicHeader />
      
      <main className="container mx-auto px-6 py-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-[#6d4c41] mb-8">
          <Link href="/shop" className="hover:text-[#b08ba5] transition-colors flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back to Shop
          </Link>
          <span>/</span>
          <span className="text-[#5d4037] font-medium">{product.title}</span>
        </div>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
          {/* Product Images */}
          <div 
            
            className="space-y-6"
          >
            <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl aspect-[4/3] bg-white">
              {product.featured_image_url ? (
                <Image
                  src={product.featured_image_url}
                  alt={product.title ?? 'Educational Resource'}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 50vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-[#b08ba5]/5 flex items-center justify-center">
                  <BookOpen className="h-24 w-24 text-[#b08ba5]/30" />
                </div>
              )}
              {isOnSale && (
                <Badge variant="destructive" className="absolute top-4 right-4 text-base px-3 py-1 shadow-lg">
                  Save {Math.round(((compareNum! - priceNum) / compareNum!) * 100)}%
                </Badge>
              )}
              {/* Educational badges */}
              <div className="absolute top-4 left-4 space-y-2">
                <Badge className="bg-[#b08ba5]/90 text-white hover:bg-[#b08ba5]">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  Educational Resource
                </Badge>
                <Badge className="bg-green-600/90 text-white hover:bg-green-600">
                  <Download className="h-3 w-3 mr-1" />
                  Instant Download
                </Badge>
              </div>
            </div>

            {/* Additional Product Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-[#b08ba5]/20">
                <CardContent className="p-4 text-center">
                  <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Eye className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-[#5d4037]">Preview Available</p>
                  <p className="text-xs text-[#6d4c41]">See sample pages</p>
                </CardContent>
              </Card>
              <Card className="border-[#b08ba5]/20">
                <CardContent className="p-4 text-center">
                  <div className="bg-green-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Printer className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-[#5d4037]">Print Ready</p>
                  <p className="text-xs text-[#6d4c41]">High-quality PDFs</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Product Details */}
          <div 
            
            className="space-y-6"
          >
            {/* Product Title and Rating */}
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-serif tracking-tight text-[#5d4037] leading-tight">
                {product.title}
              </h1>
              
              {/* Rating and Social Proof */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-sm font-medium text-[#5d4037] ml-1">4.9</span>
                  <span className="text-sm text-[#6d4c41]">(127 reviews)</span>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  <Heart className="h-3 w-3 mr-1" />
                  Community Favorite
                </Badge>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-gradient-to-r from-[#b08ba5]/5 to-[#f1b5bc]/5 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                {isOnSale && (
                  <span className="text-2xl text-gray-500 line-through">{formattedCompareAtPrice}</span>
                )}
                <span className={`text-4xl font-bold ${isOnSale ? 'text-rose-700' : 'text-[#b08ba5]'}`}>
                  {formattedPrice}
                </span>
                {isOnSale && (
                  <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-200">
                    Save {((compareNum! - priceNum) / 100).toFixed(0)}
                  </Badge>
                )}
              </div>
              <p className="text-[#6d4c41] text-sm">
                💾 <strong>Digital Download</strong> • Delivered instantly via email • No shipping required
              </p>
            </div>

            {/* Educational Benefits */}
            <Card className="border-[#b08ba5]/20">
              <CardHeader>
                <CardTitle className="font-serif text-[#5d4037] flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#b08ba5]" />
                  Educational Benefits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Develops critical thinking and problem-solving skills",
                  "Aligns with homeschool curriculum standards",
                  "Engaging activities that make learning fun",
                  "Suitable for multiple learning styles",
                  "Parent-friendly instructions included"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-[#6d4c41]">{benefit}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Add to Cart and Buy Now */}
            <div className="space-y-3">
              <PublicAddToCartButton
                productId={product.id}
                title={product.title || 'Educational Resource'}
                price={priceNum}
                imageUrl={product.featured_image_url || ''}
                size="lg"
              />
              
              <Card className="border-[#b08ba5]/20 bg-[#b08ba5]/5">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#5d4037] mb-2">
                      Want this resource right now?
                    </p>
                    <CheckoutClient
                      productId={product.id}
                      productHandle={product.handle ?? ''}
                      productTitle={product.title ?? 'Educational Resource'}
                      amount={priceNum}
                      currency="PHP"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* What's Included */}
            <Card className="border-[#b08ba5]/20">
              <CardHeader>
                <CardTitle className="font-serif text-[#5d4037] flex items-center gap-2">
                  <Gift className="h-5 w-5 text-[#b08ba5]" />
                  What's Included
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: FileText, text: "High-resolution PDF files ready for printing" },
                  { icon: ImageIcon, text: "Full-color worksheets and activity pages" },
                  { icon: BookOpen, text: "Teacher guide with instructions and tips" },
                  { icon: Play, text: "Bonus: Video tutorial for effective use" }
                ].map((item, index) => {
                  const IconComponent = item.icon
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="bg-[#b08ba5]/10 w-8 h-8 rounded-full flex items-center justify-center">
                        <IconComponent className="h-4 w-4 text-[#b08ba5]" />
                      </div>
                      <span className="text-sm text-[#6d4c41]">{item.text}</span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Product Description */}
        {product.description_html && (
          <div 
            
            className="mt-16"
          >
            <Card className="border-[#b08ba5]/20">
              <CardHeader>
                <CardTitle className="font-serif text-2xl text-[#5d4037]">About This Resource</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="prose prose-sm md:prose max-w-none prose-headings:text-[#5d4037] prose-p:text-[#6d4c41] prose-strong:text-[#5d4037]" 
                  dangerouslySetInnerHTML={{ __html: product.description_html }} 
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trust and Security */}
        <div 

          className="mt-12"
        >
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardHeader>
              <CardTitle className="font-serif text-[#5d4037] flex items-center gap-2">
                <Shield className="h-6 w-6 text-green-600" />
                Your Purchase is Protected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <Shield className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-[#5d4037]">Secure Payment</p>
                    <p className="text-[#6d4c41]">Bank-level encryption via Xendit</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Download className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-[#5d4037]">Instant Access</p>
                    <p className="text-[#6d4c41]">Download immediately after purchase</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <RefreshCw className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-[#5d4037]">7-Day Guarantee</p>
                    <p className="text-[#6d4c41]">Full refund if not satisfied</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-[#5d4037]">Lifetime Access</p>
                    <p className="text-[#6d4c41]">Re-download anytime</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Social Proof and Reviews */}
        <div 

          className="mt-12"
        >
          <Card className="border-[#b08ba5]/20">
            <CardHeader>
              <CardTitle className="font-serif text-[#5d4037] flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400" /> 
                Loved by Homeschool Families
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-2xl font-bold text-[#5d4037]">4.9/5</p>
                  <p className="text-sm text-[#6d4c41]">Average rating</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="h-6 w-6 text-[#b08ba5]" />
                  </div>
                  <p className="text-2xl font-bold text-[#5d4037]">500+</p>
                  <p className="text-sm text-[#6d4c41]">Families served</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Heart className="h-6 w-6 text-rose-500" />
                  </div>
                  <p className="text-2xl font-bold text-[#5d4037]">98%</p>
                  <p className="text-sm text-[#6d4c41]">Would recommend</p>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div className="space-y-4">
                <blockquote className="border-l-4 border-[#b08ba5] pl-4 italic text-[#6d4c41]">
                  "This resource saved me hours of prep time and my kids absolutely loved the activities! 
                  The quality is outstanding and the instructions are so clear."
                </blockquote>
                <p className="text-sm text-[#5d4037] font-medium">— Sarah M., Homeschool Mom of 3</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div 
            
            className="mt-16"
          >
            <RelatedDesigns products={related as any} />
          </div>
        )}
      </main>
      
      <PublicFooter />
    </div>
  )
}