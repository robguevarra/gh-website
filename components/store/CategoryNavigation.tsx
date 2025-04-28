'use client';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { 
  Calendar, 
  BookOpen, 
  Sticker, 
  Newspaper, 
  Tag, 
  AlignJustify,
  LayoutGrid,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Define the type for a collection passed in props
interface CollectionInfo {
  handle: string;
  // Add title?: string; if you plan to fetch and pass titles later
}

// Define the component props
interface CategoryNavigationProps {
  collections: CollectionInfo[]; // Expect an array of collections
  activeCollectionHandle: string | null; // The handle of the currently active collection
}

const CategoryNavigation: React.FC<CategoryNavigationProps> = ({ 
  collections = [], // Default to empty array
  activeCollectionHandle = null, // Default to null (All)
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleCollectionClick = (collectionHandle: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    // Set collection param, remove 'q' param
    if (collectionHandle && collectionHandle !== 'all') {
        current.set("collection", collectionHandle);
    } else {
        // If 'all' is clicked, remove the collection param
        current.delete("collection");
    }
    current.delete("q"); // Always remove search query when changing collection

    const search = current.toString();
    const queryStr = search ? `?${search}` : "";

    // Use router.push for navigation, allowing back button usage
    router.push(`${pathname}${queryStr}`);
    
    // Scroll to results section smoothly after navigation
    // Use setTimeout to allow the DOM to update after route change
    setTimeout(() => {
      const resultsSection = document.getElementById('store-results');
      resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100); // Adjust delay if needed
  };
  
  // Create a dynamic list including an "All Designs" option
  const displayItems = [
    { handle: 'all', name: 'All Designs', icon: LayoutGrid },
    ...collections.map(col => ({
      handle: col.handle,
      name: col.handle.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Simple title generation from handle
      icon: Package // Default icon for now
    }))
  ];

  return (
    <div className="mb-10">
      <h2 className="sr-only">Product Collections</h2>
      
      {/* Desktop category buttons */}
      <div className="hidden md:flex flex-wrap justify-center gap-2">
        {displayItems.map((item) => {
          const Icon = item.icon;
          // Active if handles match, or if active is null/undefined and item is 'all'
          const isActive = item.handle === 'all' 
            ? !activeCollectionHandle || activeCollectionHandle === 'all' 
            : activeCollectionHandle === item.handle;
          
          return (
            <Button
              key={item.handle} // Use handle as key
              variant={isActive ? "default" : "outline"}
              className={`
                h-auto py-2 px-4
                ${isActive 
                  ? 'bg-primary text-primary-foreground'
                  : 'border-primary/20 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/50'}
              `}
              // Pass item.handle, or 'all' to clear filter
              onClick={() => handleCollectionClick(item.handle)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {item.name}
            </Button>
          );
        })}
      </div>

      {/* Mobile category tiles */}
      <div className="md:hidden grid grid-cols-2 sm:grid-cols-3 gap-3 px-4">
        {displayItems.map((item) => {
          const Icon = item.icon;
           // Active if handles match, or if active is null/undefined and item is 'all'
          const isActive = item.handle === 'all' 
            ? !activeCollectionHandle || activeCollectionHandle === 'all'
            : activeCollectionHandle === item.handle;
          
          return (
            <button
              key={item.handle} // Use handle as key
              className={`
                flex flex-col items-center justify-center p-4 rounded-lg transition-all
                ${isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted/20 border border-muted hover:bg-primary/10 hover:border-primary/30'}
              `}
              // Pass item.handle, or 'all' to clear filter
              onClick={() => handleCollectionClick(item.handle)}
            >
              <Icon className="h-6 w-6 mb-2" />
              <span className="text-sm font-medium text-center">{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryNavigation; 