'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  BookOpen, 
  Sticker, 
  Newspaper, 
  Tag, 
  AlignJustify,
  LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Define our categories with appropriate icons
const categories = [
  { id: 'all', name: 'All Designs', icon: LayoutGrid },
  { id: 'planners', name: 'Planners', icon: AlignJustify },
  { id: 'journals', name: 'Journals', icon: BookOpen },
  { id: 'stickers', name: 'Stickers', icon: Sticker },
  { id: 'calendars', name: 'Calendars', icon: Calendar },
  { id: 'printables', name: 'Printables', icon: Newspaper },
  { id: 'tags', name: 'Tags & Labels', icon: Tag },
];

interface CategoryNavigationProps {
  activeCategory: string;
  onCategoryChange?: (categoryId: string) => void;
}

const CategoryNavigation: React.FC<CategoryNavigationProps> = ({ 
  activeCategory = 'all',
  onCategoryChange 
}) => {
  // Add local state for when onCategoryChange isn't provided
  const [activeLocalCategory, setActiveLocalCategory] = useState(activeCategory);
  
  // Use either the prop value or local state
  const currentCategory = onCategoryChange ? activeCategory : activeLocalCategory;
  
  // Handle category changes internally or via props
  const handleCategoryChange = (categoryId: string) => {
    if (onCategoryChange) {
      onCategoryChange(categoryId);
    } else {
      setActiveLocalCategory(categoryId);
    }
  };
  
  return (
    <div className="mb-10">
      <h2 className="sr-only">Product Categories</h2>
      
      {/* Desktop category buttons */}
      <div className="hidden md:flex flex-wrap justify-center gap-2">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = currentCategory === category.id;
          
          return (
            <Button
              key={category.id}
              variant={isActive ? "default" : "outline"}
              className={`
                h-auto py-2 px-4
                ${isActive 
                  ? 'bg-primary text-primary-foreground'
                  : 'border-primary/20 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/50'}
              `}
              onClick={() => handleCategoryChange(category.id)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {category.name}
            </Button>
          );
        })}
      </div>

      {/* Mobile category tiles */}
      <div className="md:hidden grid grid-cols-2 sm:grid-cols-3 gap-3 px-4">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = currentCategory === category.id;
          
          return (
            <button
              key={category.id}
              className={`
                flex flex-col items-center justify-center p-4 rounded-lg transition-all
                ${isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted/20 border border-muted hover:bg-primary/10 hover:border-primary/30'}
              `}
              onClick={() => handleCategoryChange(category.id)}
            >
              <Icon className="h-6 w-6 mb-2" />
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryNavigation; 