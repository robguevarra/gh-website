import React from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ProductCard from './ProductCard';
import { ProductData } from '@/app/dashboard/store/page'; // Use the same type
// Import Shadcn Carousel components
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Fetch products tagged as 'on sale' from Supabase
async function getSaleProducts(): Promise<ProductData[]> {
  const supabase = await createServerSupabaseClient();

  // We need to select the same fields as getMemberProductsStore for ProductData type
  const { data, error } = await supabase
    .from('shopify_products')
    .select(`
      id,
      title,
      handle,
      featured_image_url,
      shopify_product_variants (
        price,
        compare_at_price
      )
    `)
    .eq('status', 'ACTIVE')
    .contains('tags', ['status:sale']) // Filter by sale tag
    .not('shopify_product_variants', 'is', null)
    .limit(1, { foreignTable: 'shopify_product_variants' })
    .limit(12); // Limit the number of sale items shown initially (adjust if needed for carousel)

  if (error) {
    console.error('Error fetching sale products:', error);
    return [];
  }
  if (!data) {
    return [];
  }

  // Transform data to match ProductData type, similar to store page fetch
  const products: ProductData[] = data
    .map((product: any): ProductData | null => { // Use any temporarily, ideally type this better
      const variant = product.shopify_product_variants?.[0];
      
      if (!variant || variant.price === null || variant.price === undefined || isNaN(Number(variant.price))) {
        return null; // Skip products with invalid price data
      }

      let compareAtPrice: number | null = null;
      if (variant.compare_at_price !== null && variant.compare_at_price !== undefined) {
        const parsedCompareAtPrice = Number(variant.compare_at_price);
        if (!isNaN(parsedCompareAtPrice)) {
          compareAtPrice = parsedCompareAtPrice;
        }
      }
      
      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        featured_image_url: product.featured_image_url,
        price: Number(variant.price),
        compare_at_price: compareAtPrice,
      };
    })
    .filter((product): product is ProductData => product !== null);

  return products;
}

// Sale Section Server Component
const SaleSection = async () => {
  const saleProducts = await getSaleProducts();

  if (saleProducts.length === 0) {
    // Optionally render nothing or a subtle message if no sale items
    return null; 
    // Or: return <div className="text-center text-muted-foreground py-8">No current promotions.</div>;
  }

  return (
    <div className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-serif font-bold mb-8 text-center">Current Promotions</h2>
        {/* Replace grid with Shadcn Carousel */}
        <Carousel
          opts={{
            align: "start",
            loop: saleProducts.length > 4, // Loop only if enough items
          }}
          className="w-full max-w-full" // Adjust max-width as needed
        >
          <CarouselContent className="-ml-4">
            {saleProducts.map((product) => (
              <CarouselItem key={product.id} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <div className="h-full p-1"> {/* Add padding if needed for spacing */}
                  <ProductCard product={product} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute left-[-50px] top-1/2 -translate-y-1/2 hidden sm:flex" />
          <CarouselNext className="absolute right-[-50px] top-1/2 -translate-y-1/2 hidden sm:flex" />
        </Carousel>
        {/* Optional: Add a button to view all sale items if needed */}
      </div>
    </div>
  );
};

export default SaleSection; 