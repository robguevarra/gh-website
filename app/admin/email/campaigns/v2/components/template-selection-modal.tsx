// app/admin/email/campaigns/components/template-selection-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search } from 'lucide-react';

// Define a more detailed type for what the API returns for each template in the list
interface ApiEmailTemplate {
  id: string;
  name: string;
  category: string | null;
  subject: string | null;
  html_content: string | null;
  design_json: any; // This now comes mapped from the API
  // Add other fields if necessary, like created_at, updated_at if used in the modal for display
}

// This is what the modal uses internally and for filtering
interface EmailTemplateSummary {
  id: string;
  name: string;
  category: string | null;
  // Retain fields needed by onTemplateSelect or for display in the modal
  html_content: string | null; 
  design_json: any; 
}

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSelect: (template: { id: string; htmlBody: string | null; designJson: any }) => void;
}

export function TemplateSelectionModal({
  isOpen,
  onClose,
  onTemplateSelect,
}: TemplateSelectionModalProps) {
  const [templates, setTemplates] = useState<EmailTemplateSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchTemplates = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch('/api/admin/email/templates?limit=200'); // Fetch a good number of templates
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to fetch templates: ${response.statusText}`);
          }
          const data: { templates: ApiEmailTemplate[] } = await response.json();
          
          // Map API data to EmailTemplateSummary for internal state and onTemplateSelect
          const summarizedTemplates: EmailTemplateSummary[] = data.templates.map(t => ({
            id: t.id,
            name: t.name,
            category: t.category,
            html_content: t.html_content,
            design_json: t.design_json,
          }));

          setTemplates(summarizedTemplates);
        } catch (err: any) {
          setError(err.message || 'An unknown error occurred');
        } finally {
          setIsLoading(false);
        }
      };
      fetchTemplates();
    }
  }, [isOpen]);

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (template: EmailTemplateSummary) => {
    onTemplateSelect({
      id: template.id,
      htmlBody: template.html_content, // Pass html_content as htmlBody
      designJson: template.design_json,  // Pass design_json as designJson
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>Select Email Template</DialogTitle>
          <DialogDescription>
            Choose an existing email template to use as a starting point for your campaign.
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search templates by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </div>

        {isLoading && templates.length === 0 && (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
            <div className="text-red-500 text-center p-4 bg-red-50 border border-red-200 rounded-md">{error}</div>
        )}

        {!isLoading && !error && templates.length > 0 && filteredTemplates.length === 0 && (
            <div className="text-center p-4 text-muted-foreground">No templates match your search.</div>
        )}
        
        {!isLoading && !error && templates.length === 0 && !searchTerm && (
            <div className="text-center p-4 text-muted-foreground">No templates available.</div>
        )}

        {!error && filteredTemplates.length > 0 && (
          <ScrollArea className="h-[50vh] pr-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle className="text-base truncate" title={template.name}>{template.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="h-20 text-xs text-muted-foreground overflow-hidden">
                    <p>Category: {template.category || 'Uncategorized'}</p>
                    {/* Simple content preview attempt */}
                    {template.html_content && (
                        <div className="mt-1 text-gray-500 text-ellipsis overflow-hidden whitespace-nowrap">
                            {template.html_content.replace(/<[^>]+>/g, '').substring(0,50)}...
                        </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button 
                        className="w-full" 
                        onClick={() => handleSelect(template)}
                        disabled={isLoading} 
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                      Select
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
