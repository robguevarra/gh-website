'use client';

/**
 * Email Templates Manager Component
 * 
 * This client component handles the management of email templates,
 * including listing, editing, and previewing.
 */

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Edit, Eye, Send, Save, FileCode, ArrowLeft } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import UnlayerEmailEditor from './unlayer-email-editor';
import { unlayerTemplates } from '@/lib/services/email/unlayer-templates/index';
import TemplatePreview from './template-preview';
import TemplateTester from './template-tester';

// Define template types
type EmailTemplate = {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  updatedAt: string;
  version?: number;
  tags?: string[];
};

type DetailedTemplate = EmailTemplate & {
  htmlTemplate: string;
  renderedHtml: string;
  subject?: string;
  design?: any; // Unlayer design JSON
  previousVersions?: {
    version: number;
    htmlTemplate: string;
    design?: any; // Unlayer design JSON
    updatedAt: string;
    editedBy?: string;
  }[];
};

// Test variable suggestions for different template types
const TEMPLATE_VARIABLES: Record<string, Record<string, string>> = {
  welcome: {
    firstName: 'Test User',
    loginUrl: 'https://gracefulhomeschooling.com/login',
  },
  'password-reset': {
    firstName: 'Test User',
    resetUrl: 'https://gracefulhomeschooling.com/reset-password?token=test-token',
    expiresInMinutes: '60',
  },
  'class-reminder': {
    firstName: 'Test User',
    className: 'Homeschooling Essentials',
    classDate: 'May 15, 2025',
    classTime: '10:00 AM (PHT)',
    zoomLink: 'https://zoom.us/j/123456789',
    preparationMaterials: 'Please review the chapter on curriculum planning before the class.',
  },
  'email-verification': {
    firstName: 'Test User',
    verificationUrl: 'https://gracefulhomeschooling.com/verify-email?token=test-token',
  },
};

// Default variables for templates that don't have specific suggestions
const DEFAULT_VARIABLES = {
  firstName: 'Test User',
  email: 'user@example.com',
  date: format(new Date(), 'MMMM d, yyyy'),
};

/**
 * Main email templates manager component
 */
export default function EmailTemplatesManager() {
  // State for templates list
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for template editing
  const [selectedTemplate, setSelectedTemplate] = useState<DetailedTemplate | null>(null);
  const [editedHtml, setEditedHtml] = useState<string>('');
  const [designJson, setDesignJson] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for template preview
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  // State for current view
  const [view, setView] = useState<'list' | 'edit' | 'preview' | 'test'>('list');
  
  // Filter state - move these from conditional rendering to top level
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);
  
  // Keyboard shortcut handler for saving templates (save this before any conditional hooks)
  useEffect(() => {
    // Only add keyboard shortcuts when in edit mode with a selected template
    if (view !== 'edit' || !selectedTemplate) return;
    
    // Define the keyboard shortcut handler
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (typeof window !== 'undefined' && (window as any).unlayerExportHtml) {
          (window as any).unlayerExportHtml();
        }
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [view, selectedTemplate]);
  
  // Create new template using our Unlayer templates
  const createNewTemplate = async (templateType: string, name: string, category: string) => {
    setIsLoading(true);
    try {
      // Check if we have a template for this type
      const templateDesign = unlayerTemplates[templateType as keyof typeof unlayerTemplates];
      
      if (!templateDesign) {
        throw new Error(`No template found for type: ${templateType}`);
      }
      
      // Create the template in the database
      const response = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          category: category,
          description: `${name} template created using Unlayer Editor`,
          isActive: true,
          // Store the design JSON
          design: templateDesign,
          // Generate basic HTML from design
          htmlTemplate: '',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create template');
      }
      
      const data = await response.json();
      
      toast({
        title: 'Success',
        description: 'Template created successfully',
      });
      
      // Refresh templates list
      await fetchTemplates();
      
      // Select and edit the new template
      if (data.id) {
        await fetchTemplate(data.id);
        setView('edit');
      }
    } catch (err) {
      console.error('Error creating template:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create template',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get template suggestions based on template ID
  const getTemplateSuggestions = (templateId: string) => {
    // Try to find specific variables for this template
    for (const [id, vars] of Object.entries(TEMPLATE_VARIABLES)) {
      if (templateId.includes(id)) {
        return { ...DEFAULT_VARIABLES, ...vars };
      }
    }
    return DEFAULT_VARIABLES;
  };
  
  // Convert variables to Unlayer merge tags format
  const getMergeTagGroups = (templateId: string) => {
    const variables = getTemplateSuggestions(templateId);
    
    // User variables group
    const userVars = Object.entries(variables)
      .filter(([key]) => key.startsWith('firstName') || key.startsWith('lastName') || key.startsWith('email'))
      .map(([key, value]) => ({
        name: key.replace(/([A-Z])/g, ' $1').trim(),
        value: `{{${key}}}`,
        sample: String(value)
      }));
      
    // Content variables group
    const contentVars = Object.entries(variables)
      .filter(([key]) => !key.startsWith('firstName') && !key.startsWith('lastName') && !key.startsWith('email'))
      .map(([key, value]) => ({
        name: key.replace(/([A-Z])/g, ' $1').trim(),
        value: `{{${key}}}`,
        sample: String(value)
      }));
    
    return [
      {
        name: 'User Information',
        tags: userVars
      },
      {
        name: 'Content Variables',
        tags: contentVars
      }
    ];
  };
  
  // Fetch all templates
  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/email-templates');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
      toast({
        title: 'Error',
        description: 'Failed to load email templates',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch a specific template
  const fetchTemplate = async (templateId: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateId }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }
      
      const data = await response.json();
      const template = data.template;
      
      if (!template) {
        throw new Error('Template not found');
      }
      
      setSelectedTemplate(template);
      // Set edited HTML and design JSON
      setEditedHtml(template.htmlTemplate || '');
      setDesignJson(template.design || null);
      
      // Set default variables for preview
      setPreviewVariables(getTemplateSuggestions(templateId));
      
      return template;
    } catch (err) {
      console.error('Error fetching template:', err);
      toast({
        title: 'Error',
        description: 'Failed to load template details',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save a template
  const saveTemplate = async () => {
    if (!selectedTemplate || !editedHtml) return;
    
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/admin/email-templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          htmlTemplate: editedHtml,
          design: designJson, // Add design JSON
          category: selectedTemplate.category,
          subcategory: selectedTemplate.subcategory || null,
          version: selectedTemplate.version || 1
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save template');
      }
      
      toast({
        title: 'Success',
        description: 'Template saved successfully',
      });
      
      // Refresh the template to get the latest version
      await fetchTemplate(selectedTemplate.id);
      
      // Refresh the templates list
      fetchTemplates();
    } catch (err) {
      console.error('Error saving template:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save template',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Preview the template with current variables
  const previewTemplate = async () => {
    if (!editedHtml) return;
    
    try {
      setIsPreviewLoading(true);
      
      const response = await fetch('/api/admin/email-templates', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // HTML content from Unlayer editor
          htmlTemplate: editedHtml,
          variables: previewVariables,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to preview template');
      }
      
      const data = await response.json();
      setPreviewHtml(data.html);
      setView('preview');
    } catch (err) {
      console.error('Error previewing template:', err);
      toast({
        title: 'Error',
        description: 'Failed to generate preview',
        variant: 'destructive',
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };
  
  // Handle selecting a template to edit
  const handleSelectTemplate = async (templateId: string) => {
    const template = await fetchTemplate(templateId);
    if (template) {
      setIsEditing(true);
      setView('edit');
    }
  };
  
  // Render loading state
  if (isLoading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // Render error state
  if (error && templates.length === 0) {
    return (
      <div className="text-center p-8 space-y-4">
        <p className="text-destructive font-medium">Failed to load templates</p>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchTemplates}>Retry</Button>
      </div>
    );
  }
  
  // Define template categories and subcategories
  const TEMPLATE_CATEGORIES = [
    {
      name: 'authentication',
      label: 'Authentication',
      subcategories: [
        { name: 'welcome', label: 'Welcome' },
        { name: 'password-reset', label: 'Password Reset' },
        { name: 'email-verification', label: 'Email Verification' },
      ],
    },
    {
      name: 'transactional',
      label: 'Transactional',
      subcategories: [
        { name: 'class-reminder', label: 'Class Reminder' },
        { name: 'purchase-confirmation', label: 'Purchase Confirmation' },
        { name: 'account-update', label: 'Account Update' },
      ],
    },
    {
      name: 'marketing',
      label: 'Marketing',
      subcategories: [
        { name: 'newsletter', label: 'Newsletter' },
        { name: 'promotion', label: 'Promotion' },
        { name: 'announcement', label: 'Announcement' },
      ],
    },
    {
      name: 'educational',
      label: 'Educational',
      subcategories: [
        { name: 'course-material', label: 'Course Material' },
        { name: 'assignment', label: 'Assignment' },
        { name: 'feedback', label: 'Feedback' },
      ],
    },
  ];

  // Filter state (moved to top level)

  // Filter templates based on active category and search query
  const filteredTemplates = templates.filter((template) => {
    // Filter by category if one is selected
    if (activeCategory && template.category !== activeCategory) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query) ||
        (template.subcategory && template.subcategory.toLowerCase().includes(query)) ||
        (template.tags && template.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    return true;
  });

  // Render template list
  if (view === 'list') {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Email Templates Library</CardTitle>
            <CardDescription>
              Manage your email templates across different categories.
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select
              onValueChange={(value) => {
                if (value && unlayerTemplates[value as keyof typeof unlayerTemplates]) {
                  // Open dialog for template creation
                  const category = value.includes('welcome') || value.includes('password-reset') || value.includes('verification') 
                    ? 'authentication' 
                    : value.includes('reminder') 
                      ? 'transactional' 
                      : 'marketing';
                  
                  const name = TEMPLATE_CATEGORIES
                    .find(c => c.name === category)?.subcategories
                    .find(s => value.includes(s.name))?.label || 'New Template';
                  
                  // Create new template
                  createNewTemplate(value, name, category);
                }
              }}
            >
              <SelectTrigger className="w-[180px]">
                <Button variant="outline">
                  <FileCode className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email-verification">Email Verification</SelectItem>
                <SelectItem value="password-reset">Password Reset</SelectItem>
                <SelectItem value="welcome">Welcome</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative w-full sm:w-80">
              <Input
                placeholder="Search templates..."
                className="w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setSearchQuery('')}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </Button>
              )}
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={!activeCategory ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(null)}
              >
                All
              </Button>
              
              {TEMPLATE_CATEGORIES.map((category) => (
                <Button
                  key={category.name}
                  variant={activeCategory === category.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(category.name)}
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Templates Table */}
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subcategory</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {TEMPLATE_CATEGORIES.find(c => c.name === template.category)?.label || template.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {template.subcategory && (
                        <Badge variant="secondary" className="capitalize">
                          {TEMPLATE_CATEGORIES.find(c => c.name === template.category)?.subcategories.find(s => s.name === template.subcategory)?.label || template.subcategory}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      v{template.version || 1}
                    </TableCell>
                    <TableCell>{format(new Date(template.updatedAt), 'MMM d, yyyy h:mm a')}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectTemplate(template.id)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                
                {filteredTemplates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {searchQuery || activeCategory ? 'No templates match your search criteria' : 'No templates found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Save template with version history
  const saveTemplateWithVersion = async () => {
    if (!selectedTemplate || !editedHtml) return;
    
    try {
      setIsSaving(true);
      
      // Current version or 1 if not set
      const currentVersion = selectedTemplate.version || 1;
      
      // Prepare previous version data
      let previousVersion = null;
      if (selectedTemplate.htmlTemplate) {
        previousVersion = {
          version: currentVersion,
          htmlTemplate: selectedTemplate.htmlTemplate,
          design: selectedTemplate.design, // Store design JSON for version history
          updatedAt: selectedTemplate.updatedAt || new Date().toISOString(),
        };
      }
      
      const response = await fetch('/api/admin/email-templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          htmlTemplate: editedHtml,
          design: designJson, // Include design JSON
          category: selectedTemplate.category,
          subcategory: selectedTemplate.subcategory || '',
          version: currentVersion + 1,
          previousVersion: previousVersion,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save template');
      }
      
      toast({
        title: 'Success',
        description: `Template saved successfully as version ${currentVersion + 1}`,
      });
      
      // Refresh the template to get the latest version
      await fetchTemplate(selectedTemplate.id);
      
      // Refresh the templates list
      fetchTemplates();
    } catch (err) {
      console.error('Error saving template:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save template',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Restore a previous version
  const restoreVersion = async (version: number) => {
    if (!selectedTemplate || !selectedTemplate.previousVersions) return;
    
    const versionToRestore = selectedTemplate.previousVersions.find(v => v.version === version);
    if (!versionToRestore) {
      toast({
        title: 'Error',
        description: 'Version not found',
        variant: 'destructive',
      });
      return;
    }
    
    // Set the editor content to the previous version
    setEditedHtml(versionToRestore.htmlTemplate);
    setDesignJson(versionToRestore.design || null);
    
    toast({
      title: 'Version Restored',
      description: `Restored version ${version}. Save to make this the current version.`,
    });
  };
  
  // Let's just delete this new hook for now to solve the hook order issue

  // Helper functions for template editing - defined outside render conditions
  const handleSave = async () => {
    if (typeof window !== 'undefined' && (window as any).unlayerExportHtml) {
      console.log('Calling Unlayer export HTML');
      (window as any).unlayerExportHtml();
    } else {
      console.error('Unlayer export method not found');
    }
  };
  
  const handlePreview = () => {
    if (typeof window !== 'undefined' && (window as any).unlayerPreview) {
      console.log('Calling Unlayer preview');
      (window as any).unlayerPreview();
    } else {
      console.error('Unlayer preview method not found');
      // Fall back to direct preview if needed
      previewTemplate();
    }
  };
  
  // Render template editor
  if (view === 'edit' && selectedTemplate) {
    return (
      <div className="h-full flex flex-col">
        {/* Simple header with minimal controls */}
        <div className="flex items-center justify-between p-3 border-b bg-background">
          <Button variant="ghost" size="sm" onClick={() => setView('list')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          
          <span className="font-medium">{selectedTemplate.name}</span>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handlePreview}
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSave}
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>

        {/* Super simple Unlayer editor following the article EXACTLY */}
        <div className="flex-1 overflow-hidden">
          <UnlayerEmailEditor 
            templateId={selectedTemplate.id}
            initialHtml={editedHtml}
            initialDesign={designJson}
            onSave={async (html, design) => {
              setEditedHtml(html);
              setDesignJson(design);
              await saveTemplate();
            }}
            onPreview={(html) => {
              setEditedHtml(html);
              previewTemplate();
            }}
          />
        </div>
      </div>
    );
  }
  
  // Render template preview
  if (view === 'preview' && selectedTemplate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={() => setView('edit')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Editor
          </Button>
          
          <div className="ml-auto space-x-2">
            <Button 
              variant="secondary" 
              onClick={() => setView('test')}
            >
              <Send className="w-4 h-4 mr-2" />
              Test Send
            </Button>
            
            <Button onClick={() => setView('edit')}>
              <Edit className="w-4 h-4 mr-2" />
              Continue Editing
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Email Preview: {selectedTemplate.name}</CardTitle>
            <CardDescription>
              This is how the email will appear when sent to recipients.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <TemplatePreview html={previewHtml} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Render test send form
  if (view === 'test' && selectedTemplate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={() => setView('preview')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Preview
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Test Email: {selectedTemplate.name}</CardTitle>
            <CardDescription>
              Send a test email to verify the template works correctly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TemplateTester
              templateId={selectedTemplate.id}
              templateName={selectedTemplate.name}
              variables={previewVariables}
              onCancel={() => setView('preview')}
              onSuccess={() => {
                toast({
                  title: 'Success',
                  description: 'Test email sent successfully',
                });
                setView('edit');
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return null;
}
