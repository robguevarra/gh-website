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

type EmailTemplateSummary = {
  id: string;
  name: string;
  category?: string;
  thumbnail_url?: string;
  design_json?: any;
  html_content?: string;
};

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSelect: (template: { id: string; htmlBody: string; designJson: any }) => void;
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
          // MOCK DATA for now:
          const data: EmailTemplateSummary[] = [
            { id: '1', name: 'Welcome Email V1', category: 'Onboarding', design_json: { body: { rows: []}}},
            { id: '2', name: 'Password Reset', category: 'Auth', design_json: {}},
            { id: '3', name: 'New Course Announcement', category: 'Marketing', design_json: {}},
          ];
          // Simulating API delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          setTemplates(data);
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

  const handleSelect = async (templateId: string) => {
    console.log('[Modal] handleSelect called with templateId:', templateId); // Log entry
    setIsLoading(true);
    setError(null);
    try {
        const selectedMockTemplate = templates.find(t => t.id === templateId);
        console.log('[Modal] selectedMockTemplate from find:', selectedMockTemplate); // Log found template
        if (!selectedMockTemplate) throw new Error('Template not found in current list');
        
        // Simulating API delay for fetching full template data
        await new Promise(resolve => setTimeout(resolve, 500));
        const fullTemplateData = {
            id: selectedMockTemplate.id,
            html_template: `<html><body><h1>${selectedMockTemplate.name}</h1><p>This is mock HTML content for ${selectedMockTemplate.name}.</p></body></html>`, 
            design: selectedMockTemplate.design_json || { body: { rows: [], values: {} } }, // Ensure design is a valid object
        };
        console.log('[Modal] constructed fullTemplateData:', fullTemplateData); // Log data to be passed

        onTemplateSelect({
            id: fullTemplateData.id,
            htmlBody: fullTemplateData.html_template,
            designJson: fullTemplateData.design,
        });
        console.log('[Modal] onTemplateSelect CALLED.'); // Log callback invocation
        onClose();
    } catch (err: any) {
        console.error('[Modal] Error in handleSelect:', err); // Log any error
        setError(err.message || 'Failed to load template details');
    } finally {
        setIsLoading(false);
    }
  };

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
                        onClick={() => handleSelect(template.id)}
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
