import React from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ProductData } from '@/app/dashboard/store/page';
import { Sparkles, Clock } from 'lucide-react';
import ShopSaleItemsButton from './ShopSaleItemsButton';
import SaleProductDisplay from './SaleProductDisplay';

// Fallback sale product data (in case no products with sale tag are found)
const FALLBACK_SALE_PRODUCTS: ProductData[] = [
  {
    id: 'fallback-1',
    title: 'Premium Homeschool Planner (PLR)',
    handle: 'premium-homeschool-planner',
    featured_image_url: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc',
    price: 1999,
    compare_at_price: 2999,
  },
  {
    id: 'fallback-2',
    title: 'Digital Curriculum Bundle (CUR)',
    handle: 'digital-curriculum-bundle',
    featured_image_url: 'https://images.unsplash.com/photo-1517697471339-4aa32003c11a',
    price: 2499,
    compare_at_price: 3999,
  },
  {
    id: 'fallback-3',
    title: 'Homeschool Tracker Templates (PLR)',
    handle: 'homeschool-tracker-templates',
    featured_image_url: 'https://images.unsplash.com/photo-1544391413-92ec14a68a93',
    price: 1499,
    compare_at_price: 2499,
  },
];

// Fetch products with compare_at_price > price from Supabase
async function getSaleProducts(): Promise<ProductData[]> {
  try {
    // First, we'll perform a raw SQL query to ensure we get products where compare_at_price > price
    // This is more accurate than filtering after the fact
    const supabase = await createServerSupabaseClient();
    
    // Let's use a simpler approach to find all variants with compare_at_price > 0
    // Following the pattern used in store-actions.ts
    const { data: saleProductIds, error: idError } = await supabase
      .from('shopify_products')
      .select(`
        id,
        shopify_product_variants (product_id, price, compare_at_price)
      `)
      .eq('status', 'ACTIVE')
      .not('shopify_product_variants.compare_at_price', 'is', null)

    if (idError) {
      console.error('Error finding sale product IDs:', idError);
      return FALLBACK_SALE_PRODUCTS;
    }

    if (!saleProductIds || saleProductIds.length === 0) {
      return FALLBACK_SALE_PRODUCTS;
    }

    // Process the results to find products with variants where compare_at_price > price
    const productIdsWithSales: string[] = [];
    
    for (const product of saleProductIds) {
      // Skip products with no variants
      if (!product.shopify_product_variants || product.shopify_product_variants.length === 0) {
        continue;
      }
      
      // Check if any variant has compare_at_price > price
      const hasSaleVariant = product.shopify_product_variants.some(variant => {
        if (!variant.price || !variant.compare_at_price) return false;
        
        const price = Number(variant.price);
        const comparePrice = Number(variant.compare_at_price);
        
        return !isNaN(price) && !isNaN(comparePrice) && comparePrice > price;
      });
      
      if (hasSaleVariant) {
        productIdsWithSales.push(product.id);
      }
    }

    // Now fetch the complete product data for these IDs
    const { data, error } = await supabase
      .from('shopify_products')
      .select(`
        id,
        title,
        handle,
        featured_image_url,
        shopify_product_variants (
          id,
          price,
          compare_at_price
        )
      `)
      .eq('status', 'ACTIVE')
      .in('id', productIdsWithSales)
    
    if (error) {
      console.error('Error fetching sale products:', error);
      return FALLBACK_SALE_PRODUCTS;
    }
    
    if (!data || data.length === 0) {
      return FALLBACK_SALE_PRODUCTS;
    }
    
    // Transform data to match ProductData type
    const products: ProductData[] = [];
    
    for (const product of data) {
      // Skip products with no variants
      if (!product.shopify_product_variants || product.shopify_product_variants.length === 0) {
        continue;
      }

      // Find the variant with the best discount (highest percentage off)
      let bestVariant = null;
      let bestDiscountPercentage = 0;
      
      for (const variant of product.shopify_product_variants) {
        // Skip variants with invalid price data
        if (variant.price === null || 
            variant.price === undefined || 
            isNaN(Number(variant.price)) ||
            variant.compare_at_price === null ||
            variant.compare_at_price === undefined ||
            isNaN(Number(variant.compare_at_price))) {
          continue;
        }
        
        const price = Number(variant.price);
        const compareAtPrice = Number(variant.compare_at_price);
        
        // Only consider variants that are actually on sale (compare_at_price > price)
        if (compareAtPrice <= price) {
          continue;
        }
        
        // Calculate discount percentage
        const discountPercentage = (compareAtPrice - price) / compareAtPrice;
        
        // Keep track of the variant with the best discount
        if (discountPercentage > bestDiscountPercentage) {
          bestVariant = variant;
          bestDiscountPercentage = discountPercentage;
        }
      }
      
      // If we found a variant on sale, add this product to our results
      if (bestVariant) {
        products.push({
          id: product.id,
          title: product.title,
          handle: product.handle,
          featured_image_url: product.featured_image_url,
          price: Number(bestVariant.price),
          compare_at_price: Number(bestVariant.compare_at_price),
        });
      }
    }
    
    // Sort products by discount percentage (highest first)
    products.sort((a, b) => {
      if (!a.compare_at_price || !b.compare_at_price) return 0;
      
      const discountA = (a.compare_at_price - a.price) / a.compare_at_price;
      const discountB = (b.compare_at_price - b.price) / b.compare_at_price;
      
      return discountB - discountA;
    });
    

    
    return products.length > 0 ? products : FALLBACK_SALE_PRODUCTS;
  } catch (error) {
    console.error('Unexpected error fetching sale products:', error);
    return FALLBACK_SALE_PRODUCTS; // Return fallback data on any error
  }
}

// Sale Section Server Component
const SaleSection = async () => {
  // Get sale products or fallbacks
  const saleProducts = await getSaleProducts();
  
  // Always render the section, as we now have fallback data if no actual sale products

  return (
    <div className="container mx-auto px-4">
      <div className="rounded-xl overflow-hidden border border-secondary relative">
        {/* Background pattern */}
        <div className="absolute inset-0 z-0 opacity-5 bg-pattern-dot"></div>
        
        {/* Main content */}
        <div className="relative z-10 flex flex-col lg:flex-row p-6 md:p-8 bg-gradient-to-r from-secondary/10 to-accent/10">
          {/* Sale info/header section */}
          <div className="lg:w-1/3 pr-0 lg:pr-8 mb-6 lg:mb-0">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-medium text-primary">Limited Time Offer</h2>
            </div>
            
            <h3 className="text-3xl font-serif font-bold mb-4 text-foreground">
              Season Sale
              <span className="block text-primary text-4xl mt-1">Up to 75% Off</span>
            </h3>
            
            <p className="text-muted-foreground mb-6">
              Elevate your paper product business with premium designs at special prices.
              Don't miss out on our best commercial licenses.  
            </p>
            
            <div className="flex items-center gap-2 mb-6">
              <Clock className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Sale ends soon</p>
            </div>
            
            <ShopSaleItemsButton />
          </div>

          {/* Featured sale products showcase */}
          <SaleProductDisplay products={saleProducts} />
        </div>
      </div>
    </div>
  );
};

export default SaleSection;
