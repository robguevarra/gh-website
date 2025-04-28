'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

// Client component for the Shop Sale Items button with scroll functionality
const ShopSaleItemsButton = () => {
  return (
    <Button 
      variant="default" 
      className="group flex items-center"
      onClick={() => {
        // Find the StoreResultsManager section and scroll to it
        document.getElementById('store-results')?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }}
    >
      Shop All Sale Items
      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
    </Button>
  );
};

export default ShopSaleItemsButton;
