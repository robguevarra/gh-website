'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Clock } from 'lucide-react';
import ShopSaleItemsButton from './ShopSaleItemsButton';
import SaleProductDisplay from './SaleProductDisplay';
import { useStudentDashboardStore, ProductData } from '@/lib/stores/student-dashboard';

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

// Sale Section Client Component
const SaleSection = () => {
  // Get state and actions from Zustand store using individual selectors
  const storeSaleProducts = useStudentDashboardStore(state => state.saleProducts);
  const isLoadingSaleProducts = useStudentDashboardStore(state => state.isLoadingSaleProducts);
  const loadSaleProducts = useStudentDashboardStore(state => state.loadSaleProducts);

  // Fetch sale products on mount
  useEffect(() => {
    loadSaleProducts(); // Force = false by default
  }, [loadSaleProducts]);

  // Determine which products to display (fetched or fallback)
  const saleProductsToDisplay = storeSaleProducts.length > 0 ? storeSaleProducts : FALLBACK_SALE_PRODUCTS;
  const isLoading = isLoadingSaleProducts; // Use store loading state
  
  return (
    <div className="container mx-auto px-4">
      <div className="rounded-xl overflow-hidden border border-secondary relative">
        {/* Background pattern */}
        <div className="absolute inset-0 z-0 opacity-5 bg-pattern-dot"></div>
        
        {/* Main content */}
        <div className="relative z-10 flex flex-col lg:flex-row p-6 md:p-8 bg-gradient-to-r from-secondary/10 to-accent/10">
          {/* Left side content */}
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

          {/* Right side content - Product Display */}
          <div className="lg:w-2/3">
            {isLoading ? (
              // Simple loading indicator
              <div className="flex justify-center items-center h-full min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <SaleProductDisplay products={saleProductsToDisplay} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleSection;
