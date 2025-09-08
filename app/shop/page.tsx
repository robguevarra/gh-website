import Image from 'next/image'
import Link from 'next/link'
import { PublicHeader } from '@/components/layout/public-header'
import { PublicFooter } from '@/components/layout/public-footer'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatPriceDisplayPHP } from '@/lib/utils/formatting'
import CategoryNavigation from '@/components/store/CategoryNavigation'
import PublicAddToCartButton from '@/components/store/PublicAddToCartButton'
import { 
  Star, 
  Users, 
  Heart, 
  Gift, 
  BookOpen, 
  GraduationCap, 
  Award,
  Download,
  Truck,
  Shield,
  Sparkles
} from 'lucide-react'

type ShopifyProductRow = Database['public']['Tables']['shopify_products']['Row']

type ProductWithVariant = ShopifyProductRow & {
  shopify_product_variants: { price: number | string | null; compare_at_price?: number | string | null }[]
}

async function getPublicProducts(filter?: { q?: string | null; collection?: string | null }): Promise<ProductWithVariant[]> {
  const supabase = await createServerSupabaseClient()
  let query = supabase
    .from('shopify_products')
    .select(`
      id,
      title,
      handle,
      featured_image_url,
      tags,
      vendor,
      shopify_product_variants ( price, compare_at_price )
    `)
    .eq('vendor', 'Graceful Resources')
    .not('shopify_product_variants', 'is', null)
    .limit(1, { foreignTable: 'shopify_product_variants' })
    .order('updated_at', { ascending: false })

  if (filter?.collection && filter.collection !== 'all') {
    query = query.filter('collection_handles', 'cs', `{"${filter.collection}"}`)
  }
  if (filter?.q && filter.q.trim().length > 0) {
    const like = `%${filter.q.trim()}%`
    query = query.or(`title.ilike.${like},description_html.ilike.${like}`)
  }

  const { data, error } = await query.returns<ProductWithVariant[]>()

  if (error || !data) return []
  return data
}

async function getPublicCollections(): Promise<{ handle: string }[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('shopify_products')
    .select('collection_handles,vendor')
    .eq('vendor', 'Graceful Resources')

  if (error || !data) return []
  const all = data.flatMap((row: any) => row.collection_handles || [])
  const unique = Array.from(new Set(all.filter((h: any) => typeof h === 'string' && h.length > 0)))
  return unique.map(handle => ({ handle }))
}

// Grade level navigation inspired by The Good and the Beautiful
const gradeLevels = [
  { label: 'Preschool', value: 'preschool', icon: Heart },
  { label: 'Kindergarten', value: 'kindergarten', icon: Star },
  { label: 'Elementary', value: 'elementary', icon: BookOpen },
  { label: 'Middle School', value: 'middle-school', icon: GraduationCap },
  { label: 'High School', value: 'high-school', icon: Award },
]

export default async function PublicShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const resolved = await searchParams
  const q = typeof resolved.q === 'string' ? resolved.q : null
  const collection = typeof resolved.collection === 'string' ? resolved.collection : null
  const [products, collections] = await Promise.all([
    getPublicProducts({ q, collection }),
    getPublicCollections(),
  ])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9f6f2] to-white">
      <PublicHeader />
      
      {/* Promotional Banner - Inspired by Good & Beautiful */}
      <div className="bg-gradient-to-r from-[#b08ba5] to-[#f1b5bc] text-white py-4">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              <span className="font-semibold">🎉 Free Digital Resources Available! Browse our collection of printables and worksheets.</span>
            </div>
            <Button variant="secondary" size="sm" className="bg-white text-[#b08ba5] hover:bg-white/90">
              View Free Resources
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-[#b08ba5]" />
            <Badge variant="outline" className="text-[#b08ba5] border-[#b08ba5]/30">
              Educator-Approved Resources
            </Badge>
          </div>
          <h1 className="font-serif text-4xl md:text-6xl text-[#5d4037] mb-4">
            Graceful Homeschooling Shop
          </h1>
          <p className="text-[#6d4c41] text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            Thoughtfully curated educational resources designed by homeschool parents, for homeschool families. 
            Find printables, worksheets, and learning materials that make education both beautiful and effective.
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-8 mb-12 text-sm text-[#6d4c41]">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#b08ba5]" />
            <span>500+ Families Served</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>4.9/5 Rating</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-600" />
            <span>Secure Checkout</span>
          </div>
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-blue-600" />
            <span>Instant Downloads</span>
          </div>
        </div>

        {/* Grade Level Navigation */}
        <div 

          className="mb-8"
        >
          <h2 className="font-serif text-2xl text-[#5d4037] mb-6 text-center">Shop by Grade Level</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {gradeLevels.map((grade) => {
              const IconComponent = grade.icon
              return (
                <Card key={grade.value} className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-4 text-center">
                    <div className="bg-[#b08ba5]/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-[#b08ba5]/20 transition-colors">
                      <IconComponent className="h-6 w-6 text-[#b08ba5]" />
                    </div>
                    <h3 className="font-medium text-[#5d4037] text-sm">{grade.label}</h3>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Search and Filter Section */}
        <div 

          className="sticky top-16 z-30 bg-white/95 backdrop-blur border-b mb-8 -mx-6 px-6 py-4 rounded-lg shadow-sm"
        >
          <div className="container mx-auto">
            <form className="flex gap-3 mb-4" action="/shop" method="get">
              <input
                name="q"
                defaultValue={q ?? ''}
                placeholder="Search educational resources..."
                className="flex-1 h-11 rounded-full border border-[#b08ba5]/20 px-4 bg-white focus:border-[#b08ba5] focus:ring-2 focus:ring-[#b08ba5]/20"
                aria-label="Search store designs"
              />
              {collection ? <input type="hidden" name="collection" value={collection} /> : null}
              <Button 
                className="h-11 px-6 rounded-full bg-[#b08ba5] hover:bg-[#9a7b90] text-white" 
                type="submit"
              >
                Search
              </Button>
            </form>
            <CategoryNavigation collections={collections} activeCollectionHandle={collection ?? 'all'} />
          </div>
        </div>

        {/* Featured Banner - Special Offers */}
        <div 

          className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6 mb-12"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-full">
                <Truck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-[#5d4037] font-semibold">Free Digital Delivery</h3>
                <p className="text-[#6d4c41] text-sm">All resources delivered instantly via email • No shipping costs ever</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
              Save on Every Order
              </Badge>
          </div>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div 
            
            className="text-center py-16"
          >
            <div className="bg-white rounded-xl border p-8 shadow-sm max-w-md mx-auto">
              <BookOpen className="h-16 w-16 text-[#b08ba5]/50 mx-auto mb-4" />
              <h2 className="text-xl font-serif text-[#5d4037] mb-2">No Resources Found</h2>
              <p className="text-[#6d4c41] mb-4">We're always adding new educational materials. Check back soon!</p>
              <Button variant="outline" className="border-[#b08ba5] text-[#b08ba5] hover:bg-[#b08ba5]/10">
                Browse All Categories
              </Button>
            </div>
          </div>
        ) : (
          <div 

            id="store-results" 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {products.map((product, index) => {
              const price = product.shopify_product_variants?.[0]?.price
              const compareAt = product.shopify_product_variants?.[0]?.compare_at_price
              const { formattedPrice, formattedCompareAtPrice } = formatPriceDisplayPHP({
                price: typeof price === 'number' ? price : Number(price ?? 0),
                compareAtPrice: typeof compareAt === 'number' ? compareAt : (compareAt ? Number(compareAt) : undefined),
              })
              const isOnSale = formattedCompareAtPrice != null

              return (
                <div
                  key={product.id}

                  className="group bg-white rounded-xl border border-[#b08ba5]/10 shadow-sm hover:shadow-lg hover:border-[#b08ba5]/20 transition-all duration-300 overflow-hidden"
                >
                  <Link href={`/shop/product/${product.handle ?? ''}`} className="block">
                    <div className="aspect-[4/3] relative w-full overflow-hidden">
                      {product.featured_image_url ? (
                        <Image
                          src={product.featured_image_url}
                          alt={product.title ?? 'Educational Resource'}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#b08ba5]/5 flex items-center justify-center">
                          <BookOpen className="h-16 w-16 text-[#b08ba5]/30" />
                        </div>
                      )}
                      {isOnSale && (
                        <Badge variant="destructive" className="absolute top-3 right-3 shadow-md">
                          Sale
                        </Badge>
                      )}
                      {/* Educational value indicator */}
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-[#b08ba5]/90 text-white hover:bg-[#b08ba5]">
                          <GraduationCap className="h-3 w-3 mr-1" />
                          Educational
                        </Badge>
                      </div>
                  </div>
                  </Link>
                  
                  <div className="p-4 space-y-3">
                    <Link href={`/shop/product/${product.handle ?? ''}`} className="hover:text-[#b08ba5] transition-colors">
                      <h3 className="font-semibold text-[#5d4037] line-clamp-2 leading-snug group-hover:text-[#b08ba5] transition-colors">
                        {product.title}
                      </h3>
                    </Link>
                    
                    {/* Star rating */}
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ))}
                      <span className="text-xs text-[#6d4c41] ml-1">(4.9)</span>
              </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isOnSale && (
                          <span className="text-sm text-gray-500 line-through">{formattedCompareAtPrice}</span>
                        )}
                        <span className={`text-lg font-bold ${isOnSale ? 'text-rose-700' : 'text-[#5d4037]'}`}>
                          {formattedPrice}
                        </span>
                      </div>
                    </div>
                    
                    <PublicAddToCartButton
                      productId={product.id}
                      title={product.title || 'Educational Resource'}
                      price={typeof price === 'number' ? price : Number(price || 0)}
                      imageUrl={product.featured_image_url || ''}
                      size="sm"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Educational Value Section */}
        <div 

          className="mt-16 bg-gradient-to-r from-[#b08ba5]/5 to-[#f1b5bc]/5 rounded-2xl p-8"
        >
          <div className="text-center mb-8">
            <h2 className="font-serif text-3xl text-[#5d4037] mb-4">Why Choose Graceful Homeschooling?</h2>
            <p className="text-[#6d4c41] max-w-2xl mx-auto">
              Every resource is carefully crafted and tested by real homeschool families to ensure quality and educational value.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Heart,
                title: "Made by Homeschool Parents",
                description: "Created by families who understand the real challenges and joys of home education."
              },
              {
                icon: Award,
                title: "Educator Approved",
                description: "All materials reviewed by certified teachers and experienced homeschool educators."
              },
              {
                icon: Users,
                title: "Community Tested",
                description: "Proven effective by hundreds of homeschool families across different learning styles."
              }
            ].map((benefit, index) => {
              const IconComponent = benefit.icon
              return (
                <Card key={benefit.title} className="border-[#b08ba5]/20 hover:border-[#b08ba5]/40 transition-colors">
                  <CardContent className="p-6 text-center">
                    <div className="bg-[#b08ba5]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="h-8 w-8 text-[#b08ba5]" />
                    </div>
                    <h3 className="font-serif text-lg text-[#5d4037] mb-2">{benefit.title}</h3>
                    <p className="text-[#6d4c41] text-sm leading-relaxed">{benefit.description}</p>
                  </CardContent>
                </Card>
              )
            })}
              </div>
        </div>
      </main>
      
      <PublicFooter />
    </div>
  )
} 