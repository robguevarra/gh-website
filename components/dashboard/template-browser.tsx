'use client';

import { useEffect, useState } from 'react';
import { useTemplates } from '@/lib/hooks/use-templates';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Filter,
  Download,
  Eye,
  FileText,
  Image,
  Table,
  FileSpreadsheet,
  ChevronRight,
} from 'lucide-react';
import { useTemplatesData, useUserProfileData } from '@/lib/hooks/use-dashboard-store';
import { type Template } from '@/lib/stores/student-dashboard/types';

// File type icon mapping
const getFileIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'doc':
    case 'docx':
      return <FileText className="h-5 w-5 text-blue-500" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
      return <Image className="h-5 w-5 text-green-500" />;
    case 'xls':
    case 'xlsx':
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    case 'csv':
      return <Table className="h-5 w-5 text-purple-500" />;
    default:
      return <FileText className="h-5 w-5 text-gray-500" />;
  }
};

interface TemplateCardProps {
  template: Template;
  onPreview: (template: Template) => void;
  onDownload: (template: Template) => void;
}

const TemplateCard = ({ template, onPreview, onDownload }: TemplateCardProps) => {
  return (
    <Card className="flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs font-normal">
            {template.type.toUpperCase()}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {template.size}
          </span>
        </div>
        <CardTitle className="text-base mt-2 line-clamp-1">{template.name}</CardTitle>
        <CardDescription className="line-clamp-2 text-xs">
          {template.description || 'No description available'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0">
        <div className="relative h-32 w-full overflow-hidden rounded-md bg-muted">
          {template.thumbnail ? (
            <img 
              src={template.thumbnail} 
              alt={template.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {getFileIcon(template.type)}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex-shrink-0 grid grid-cols-2 gap-2 pt-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => onPreview(template)}
        >
          <Eye className="mr-1 h-4 w-4" />
          Preview
        </Button>
        <Button 
          variant="default" 
          size="sm"
          className="w-full"
          onClick={() => onDownload(template)}
        >
          <Download className="mr-1 h-4 w-4" />
          Download
        </Button>
      </CardFooter>
    </Card>
  );
};

interface TemplateBrowserProps {
  onTemplateSelect?: (template: Template) => void;
}

export function TemplateBrowser({ onTemplateSelect }: TemplateBrowserProps) {
  // Use memoized state to prevent re-renders
  const { userId } = useUserProfileData();
  
  // Use memoized templates data with default fallbacks
  const templatesData = useTemplatesData();
  const storeTemplates = templatesData.templates || [];
  const templateFilter = templatesData.templateFilter || '';
  const templateSearchQuery = templatesData.templateSearchQuery || '';
  const getFilteredTemplates = templatesData.getFilteredTemplates;
  const setTemplates = templatesData.setTemplates;
  const setTemplateFilter = templatesData.setTemplateFilter;
  const setTemplateSearchQuery = templatesData.setTemplateSearchQuery;
  
  // Local component state
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  const {
    templates,
    isLoading,
    hasError,
    filter,
    searchQuery,
    applyFilter,
    applySearch,
    fetchCategories,
    loadMore,
    hasMore,
    refresh,
  } = useTemplates({
    category: activeCategory,
    searchQuery: searchTerm,
    limit: 12,
  });
  
  useEffect(() => {
    if (userId) {
      // Fetch template categories
      fetchCategories().then(setCategories);
      
      // Apply initial filter
      applyFilter(activeCategory);
    }
  }, [userId, fetchCategories, applyFilter, activeCategory]);
  
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handleSearch = () => {
    applySearch(searchTerm);
  };
  
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    applyFilter(category);
  };
  
  const handlePreview = (template: Template) => {
    setSelectedTemplate(template);
    
    // If external template select handler is provided, use it
    if (onTemplateSelect) {
      onTemplateSelect(template);
    } else {
      // Otherwise use internal preview modal
      setShowPreviewModal(true);
    }
  };
  
  const handleDownload = async (template: Template) => {
    // For Google Drive files, we need to open the direct download link
    window.open(`https://drive.google.com/uc?export=download&id=${template.googleDriveId}`, '_blank');
    
    // Increment download count
    const { useTemplate } = await import('@/lib/hooks/use-templates');
    const { incrementDownloads } = useTemplate(template.id);
    incrementDownloads();
  };
  
  // Render loading skeletons
  if (isLoading && templates.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Templates</h2>
          <div className="flex space-x-2">
            <Skeleton className="h-9 w-[250px]" />
            <Skeleton className="h-9 w-10" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-[80%]" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Skeleton className="h-32 w-full" />
              </CardContent>
              <CardFooter className="grid grid-cols-2 gap-2 pt-0">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  // Render error state
  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-destructive mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-2">Unable to load templates</h3>
        <p className="text-muted-foreground mb-4">There was an error loading your templates. Please try again later.</p>
        <Button onClick={() => refresh()}>
          Try Again
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header and search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">Templates</h2>
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex flex-1 md:w-80">
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={handleSearchInput}
              className="pr-10"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              onClick={handleSearch}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Categories */}
      <Tabs defaultValue={activeCategory} onValueChange={handleCategoryChange}>
        <TabsList className="flex overflow-x-auto py-1 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      
      {/* Template grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {templates.length > 0 ? (
          templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={handlePreview}
              onDownload={handleDownload}
            />
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-12">
            <div className="text-muted-foreground mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">No templates found</h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? `No templates matching "${searchTerm}"`
                : activeCategory !== 'all'
                  ? `No templates in the ${activeCategory} category`
                  : 'No templates available yet'
              }
            </p>
          </div>
        )}
      </div>
      
      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoading}
            className="w-full md:w-auto"
          >
            {isLoading ? 'Loading...' : 'Load More Templates'}
            {!isLoading && <ChevronRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      )}
      
      {/* Preview Modal would be implemented here */}
      {/* We'll create this as a separate component later */}
    </div>
  );
}
