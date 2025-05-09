'use client';

/**
 * Email Templates Manager Component
 * 
 * This client component handles the management of email templates,
 * including listing, editing, and previewing.
 */

// Import styles for editor button states
import './editor-styles.css';

import { useState, useEffect } from 'react';
import { extractVariablesFromContent, generateDefaultVariableValues, categorizeVariables } from '@/lib/services/email/template-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectGroup,
  SelectItem, 
  SelectLabel,
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
import { Loader2, Edit, Eye, Send, Save, FileCode, ArrowLeft, Trash2, MoreHorizontal, Pencil, Copy } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import UnlayerEmailEditor from './unlayer-email-editor';
import { unlayerTemplates } from '@/lib/services/email/unlayer-templates/index';
import TemplatePreview from './template-preview';
import TemplateTester from './template-tester';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

/**
 * Template-specific variable definitions following industry best practices:
 * 1. Variables are organized by template type and category
 * 2. Each template has its own specific set of variables
 * 3. Variables include documentation to explain their purpose
 */
type VariableCategory = 'user' | 'content' | 'action' | 'system' | 'course' | 'event';

interface TemplateVariable {
  value: string;
  description: string;
  category: VariableCategory;
}

type TemplateVariablesMap = Record<string, Record<string, TemplateVariable>>;

const TEMPLATE_VARIABLES: TemplateVariablesMap = {
  // Welcome email variables
  welcome: {
    firstName: {
      value: 'Test User',
      description: 'First name of the recipient',
      category: 'user'
    },
    loginUrl: {
      value: 'https://gracefulhomeschooling.com/login',
      description: 'URL to log into the platform',
      category: 'action'
    },
    platformName: {
      value: 'Graceful Homeschooling',
      description: 'Name of the platform',
      category: 'system'
    }
  },
  
  // Password reset email variables
  'password-reset': {
    firstName: {
      value: 'Test User',
      description: 'First name of the recipient',
      category: 'user'
    },
    resetUrl: {
      value: 'https://gracefulhomeschooling.com/reset-password?token=test-token',
      description: 'URL to reset password including secure token',
      category: 'action'
    },
    expiresInMinutes: {
      value: '60',
      description: 'Minutes until the reset link expires',
      category: 'system'
    }
  },
  
  // Class reminder email variables
  'class-reminder': {
    firstName: {
      value: 'Test User',
      description: 'First name of the recipient',
      category: 'user'
    },
    className: {
      value: 'Homeschooling Essentials',
      description: 'Name of the class',
      category: 'course'
    },
    classDate: {
      value: 'May 15, 2025',
      description: 'Date of the class',
      category: 'event'
    },
    classTime: {
      value: '10:00 AM (PHT)',
      description: 'Time of the class with timezone',
      category: 'event'
    },
    zoomLink: {
      value: 'https://zoom.us/j/123456789',
      description: 'Zoom meeting link',
      category: 'action'
    },
    preparationMaterials: {
      value: 'Please review the chapter on curriculum planning before the class.',
      description: 'Materials to prepare before class',
      category: 'content'
    }
  },
  
  // Email verification variables
  'email-verification': {
    firstName: {
      value: 'Test User',
      description: 'First name of the recipient',
      category: 'user'
    },
    verificationUrl: {
      value: 'https://gracefulhomeschooling.com/verify-email?token=test-token',
      description: 'URL to verify email including secure token',
      category: 'action'
    },
    expiresInHours: {
      value: '24',
      description: 'Hours until the verification link expires',
      category: 'system'
    }
  },
};

// Default variables for templates that don't have specific suggestions
const DEFAULT_VARIABLES = {
  firstName: 'Test User',
  email: 'user@example.com',
  date: format(new Date(), 'MMMM d, yyyy'),
  platformName: 'Graceful Homeschooling',
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
  
  // Template creation dialog state
  const [newTemplateType, setNewTemplateType] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  
  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);
  
  // Rename dialog state
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [templateToRename, setTemplateToRename] = useState<EmailTemplate | null>(null);
  const [newTemplateNameInput, setNewTemplateNameInput] = useState('');
  
  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);
  
  // Add effect to track view state changes and ensure variables are properly extracted for test view
  useEffect(() => {
    console.log('View state changed to:', view);
    
    // Handle test view with variable extraction
    if (view === 'test' && selectedTemplate?.htmlTemplate) {
      console.log('TEST VIEW ACTIVE - Conditions for rendering test form:', 
        'selectedTemplate exists?', !!selectedTemplate);
      
      console.log('Template data for test:', {
        id: selectedTemplate.id,
        name: selectedTemplate.name
      });
      
      // CRITICAL FIX: Verify that all template variables are properly extracted
      console.log('🔍 Test view checking template variables...');
      console.log('Current previewVariables:', previewVariables);
      const previewVarCount = Object.keys(previewVariables).length;
      
      // Extract variables from template to see how many there should be
      const extractedVars = extractVariablesFromContent(selectedTemplate.htmlTemplate);
      console.log('Expected variables from template:', extractedVars);
      
      // If we're missing variables, extract them directly
      if (previewVarCount < extractedVars.length) {
        console.log('❗ Variable mismatch detected! Fixing by direct extraction...');
        
        // Extract variables directly and update state
        const defaultValues = generateDefaultVariableValues(extractedVars);
        const allDetectedVariables: Record<string, string> = {};
        
        extractedVars.forEach(varName => {
          allDetectedVariables[varName] = defaultValues[varName] || `[${varName}]`;
        });
        
        console.log('🔧 Fixing variables in test view:', allDetectedVariables);
        console.log('🔢 Fixed variable count:', Object.keys(allDetectedVariables).length);
        setPreviewVariables(allDetectedVariables);
      }
    }
  }, [view, selectedTemplate, previewVariables]);
  
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
      
      // Generate a more predictable template ID format
      // const sanitizedName = name.toLowerCase().replace(/\s+/g, '-'); // No longer needed
      // const templateId = `${category}-${sanitizedName}-${Date.now().toString().slice(-6)}`; // Backend will generate UUID

      // Create the template in the database
      const response = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // id: templateId, // Remove: Backend will generate the UUID
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
      
      // Set the template details directly
      if (data.template && data.template.id) { // Ensure template and its ID exist in response
        // Use the complete template data from the response
        setSelectedTemplate(data.template);
        setEditedHtml(data.template.htmlTemplate || '');
        setDesignJson(data.template.design || null);
        setPreviewVariables(getTemplateSuggestions(data.template.id)); // Use the new ID from response
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
  
  // Detect and extract variables from template content
  const detectTemplateVariables = (templateContent: string): Record<string, string> => {
    if (!templateContent) return DEFAULT_VARIABLES;
    
    // Extract variables using the {{variable}} pattern
    const extractedVars = extractVariablesFromContent(templateContent);
    
    if (extractedVars.length === 0) {
      // Fallback to predefined variables if none detected
      return getTemplateSuggestionsByType();
    }
    
    // Generate appropriate default values for the detected variables
    return generateDefaultVariableValues(extractedVars);
  };
  
  // Get template variable info with descriptions and categories
  const getTemplateVariableInfo = (templateContent: string) => {
    // Extract variables using the {{variable}} pattern
    const extractedVars = extractVariablesFromContent(templateContent);
    
    if (extractedVars.length === 0) {
      // If no variables detected, return empty object
      return {};
    }
    
    // Generate appropriate categories and descriptions
    return categorizeVariables(extractedVars);
  };
  
  // Get template suggestions based on template type
  const getTemplateSuggestionsByType = (): Record<string, string> => {
    // Match template type by name or ID
    const templateType = Object.keys(TEMPLATE_VARIABLES).find(id => 
      selectedTemplate?.id?.includes(id) || 
      (selectedTemplate?.name?.toLowerCase().includes(id))
    );
    
    if (templateType && TEMPLATE_VARIABLES[templateType]) {
      // Extract just the values from our enhanced template variables
      const templateVars = Object.entries(TEMPLATE_VARIABLES[templateType]).reduce<Record<string, string>>(
        (acc, [key, variableObj]) => {
          acc[key] = variableObj.value;
          return acc;
        }, 
        {}
      );
      return { ...DEFAULT_VARIABLES, ...templateVars };
    }
    
    return DEFAULT_VARIABLES;
  };
  
  // Get template suggestions with smart detection
  const getTemplateSuggestions = (templateId: string): Record<string, string> => {
    // If we have a selected template with HTML content, use it for variable detection
    if (selectedTemplate?.htmlTemplate) {
      return detectTemplateVariables(selectedTemplate.htmlTemplate);
    }
    
    // Fallback to predefined variables by type
    return getTemplateSuggestionsByType();
  };
  
  // Get variable descriptions and metadata for documentation
  const getTemplateVariableDocs = (templateId: string) => {
    // If we have template content, use it for detection-based metadata
    if (selectedTemplate?.htmlTemplate) {
      const variableInfo = getTemplateVariableInfo(selectedTemplate.htmlTemplate);
      
      // If we detected variables, return them with their documentation
      if (Object.keys(variableInfo).length > 0) {
        return variableInfo;
      }
    }
    
    // Fallback to predefined variables with documentation
    const templateType = Object.keys(TEMPLATE_VARIABLES).find(id => 
      templateId.includes(id) || 
      (selectedTemplate?.name?.toLowerCase().includes(id))
    );
    
    return templateType ? TEMPLATE_VARIABLES[templateType] : {};
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
      
      // Use GET with query params instead of POST
      const response = await fetch(`/api/admin/email-templates?templateId=${encodeURIComponent(templateId)}`);
      
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
  
  // Save a template with improved visual feedback
  const saveTemplate = async () => {
    if (!selectedTemplate || !editedHtml) {
      // Silent fail with proper return value
      return false;
    }
    
    try {
      // Ensure design is properly serializable
      let preparedDesign;
      try {
        preparedDesign = designJson ? JSON.parse(JSON.stringify(designJson)) : null;
      } catch (_) {
        // Silently handle serialization errors with a fallback
        preparedDesign = null;
      }
      
      // Request payload
      const payload = {
        templateId: selectedTemplate.id,
        htmlTemplate: editedHtml,
        design: preparedDesign,
        category: selectedTemplate.category,
        subcategory: selectedTemplate.subcategory || null,
        version: selectedTemplate.version || 1
      };
      
      // Save to API
      const response = await fetch('/api/admin/email-templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });
      
      // Check response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }
      
      // Show success indicator
      toast({
        title: 'Template Saved',
        description: `${selectedTemplate.name} saved successfully`,
        variant: 'default',
      });
      
      // Add success visual indicator
      const saveButton = document.getElementById('save-button');
      if (saveButton) {
        saveButton.classList.add('success');
        setTimeout(() => saveButton.classList.remove('success'), 1500);
      }
      
      // Refresh data
      await fetchTemplate(selectedTemplate.id);
      
      return true;
    } catch (err) {
      // Show error toast
      toast({
        title: 'Save Failed',
        description: err instanceof Error ? err.message : 'Failed to save template',
        variant: 'destructive',
      });
      
      // Add error visual indicator
      const saveButton = document.getElementById('save-button');
      if (saveButton) {
        saveButton.classList.add('error');
        setTimeout(() => saveButton.classList.remove('error'), 1500);
      }
      
      return false;
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
  
  // Handle test send button click with a direct action approach
  const handleTestSend = () => {
    console.log('Test send button clicked');
    // Create a separate function to handle the direct DOM rendering approach
    const prepareAndShowTestForm = () => {
      try {
        // Check if template is selected
        if (!selectedTemplate) {
          console.error('Cannot test send: no template selected');
          return;
        }
        
        console.log('Current view state:', view, 'Preparing to change to test view');
        
        // Detect variables from the current template content
        if (selectedTemplate.htmlTemplate) {
          console.group('🔍 Template Variable Detection');
          console.log('Template ID:', selectedTemplate.id);
          console.log('Template Name:', selectedTemplate.name);
          console.log('HTML Content Length:', selectedTemplate.htmlTemplate.length);
          
          // Log first part of HTML content for debugging (truncated)
          const previewLength = 200;
          const htmlPreview = selectedTemplate.htmlTemplate.length > previewLength 
            ? selectedTemplate.htmlTemplate.substring(0, previewLength) + '...' 
            : selectedTemplate.htmlTemplate;
          console.log('HTML Content Preview:', htmlPreview);
          
          // Extract all variables from the template content
          const extractedVars = extractVariablesFromContent(selectedTemplate.htmlTemplate);
          console.log('📋 EXTRACTED VARIABLES:', extractedVars);
          
          // Generate default values for the variables
          const defaultValues = generateDefaultVariableValues(extractedVars);
          console.log('🔄 GENERATED DEFAULT VALUES:', defaultValues);
          console.table(defaultValues);
          
          // Get variable categorization and documentation
          const variableDocs = categorizeVariables(extractedVars);
          console.log('📊 VARIABLE CATEGORIES:', Object.keys(variableDocs));
          
          // CRITICAL FIX: Use the extracted variables directly without any filtering
          const allDetectedVariables: Record<string, string> = {};
          
          // Ensure ALL variables are included with their default values
          extractedVars.forEach(varName => {
            allDetectedVariables[varName] = defaultValues[varName] || `[${varName}]`;
          });
          
          console.log('🔍 ALL DETECTED VARIABLES BEING SET:', allDetectedVariables);
          console.log('🔢 VARIABLE COUNT:', Object.keys(allDetectedVariables).length);
          
          // Set the preview variables with ALL detected variables
          setPreviewVariables(allDetectedVariables);
          console.log('✅ Variables set for test form');
          console.groupEnd();
        } else {
          console.warn('⚠️ No HTML content available, using default variables');
          const defaultVars = getTemplateSuggestionsByType();
          console.log('Default variables:', defaultVars);
          setPreviewVariables(defaultVars);
        }
        
        // Switching view state to test
        console.log('Setting view state to test directly');
        setView('test');
        
        // Provide immediate feedback
        toast({
          title: 'Preparing Test Form',
          description: 'Loading test send form...',
        });
        
        console.log('Template data for test:', {
          id: selectedTemplate.id,
          name: selectedTemplate.name,
        });
      } catch (err) {
        console.error('Error in prepareAndShowTestForm:', err);
        toast({
          title: 'Error',
          description: 'Failed to prepare test form',
          variant: 'destructive',
        });
      }
    };
    
    // Execute the function immediately
    prepareAndShowTestForm();
  };
  
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
  
  // Handle actual deletion of the template
  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      setIsLoading(true); // Or a specific deleting state
      const response = await fetch(`/api/admin/email-templates/${templateToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete template');
      }

      toast({
        title: 'Success',
        description: `Template "${templateToDelete.name}" deleted successfully`,
      });

      // Update local state immediately for better UX
      setTemplates(prevTemplates => prevTemplates.filter(t => t.id !== templateToDelete.id));
      setShowDeleteDialog(false);
      setTemplateToDelete(null);
    } catch (err) {
      console.error('Error deleting template:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete template',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle save button click - simplified to use unlayer directly
  const handleSave = () => {
    console.log('Save button clicked');
    try {
      if (typeof window !== 'undefined' && (window as any).unlayerExportHtml) {
        console.log('Triggering Unlayer HTML export for save');
        // The actual saving happens in the unlayer-email-editor.tsx's exportHtml function
        // which calls our onSave callback with the HTML and design data
        (window as any).unlayerExportHtml();
      } else {
        throw new Error('Unlayer export method not found');
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to initiate save',
        variant: 'destructive',
      });
    }
  };
  
  // The handleTestSend function is properly implemented above
  
  const handleRenameTemplate = async () => {
    if (!templateToRename || !newTemplateNameInput.trim()) {
      toast({
        title: 'Error',
        description: 'New template name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true); // Or a specific renaming state
      const response = await fetch(`/api/admin/email-templates/${templateToRename.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newTemplateNameInput.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to rename template');
      }

      toast({
        title: 'Success',
        description: `Template "${templateToRename.name}" renamed to "${newTemplateNameInput.trim()}"`,
      });

      // Update local state for immediate UI feedback
      setTemplates(prevTemplates => 
        prevTemplates.map(t => 
          t.id === templateToRename.id ? { ...t, name: newTemplateNameInput.trim() } : t
        )
      );
      setShowRenameDialog(false);
      setTemplateToRename(null);
      setNewTemplateNameInput('');
    } catch (err) {
      console.error('Error renaming template:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to rename template',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDuplicateTemplate = async (templateId: string, templateName: string) => {
    try {
      setIsLoading(true); // Or a specific duplicating state
      const response = await fetch(`/api/admin/email-templates/${templateId}/duplicate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to duplicate template');
      }
      
      const { newTemplate } = await response.json(); // Assuming API returns the new template

      toast({
        title: 'Success',
        description: `Template "${templateName}" duplicated successfully as "${newTemplate?.name || 'New Template Copy'}"`,
      });

      await fetchTemplates(); // Refresh the entire list to get the new template
      
      // Optionally, switch to edit view for the new duplicate
      if (newTemplate) {
        // await handleSelectTemplate(newTemplate.id); // This would fetch it again, then switch view
        // For now, just log and let the user find it in the refreshed list or navigate manually
        console.log('New duplicated template:', newTemplate);
      }

    } catch (err) {
      console.error('Error duplicating template:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to duplicate template',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="default">
                  <FileCode className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Template</DialogTitle>
                  <DialogDescription>
                    Choose a template type to create a new professional email template with Unlayer.  
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="template-type" className="text-right">
                      Template Type
                    </Label>
                    <Select
                      onValueChange={(value) => {
                        // Store selected template type in state
                        setNewTemplateType(value);
                      }}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a template type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Authentication</SelectLabel>
                          <SelectItem value="email-verification">Email Verification</SelectItem>
                          <SelectItem value="password-reset">Password Reset</SelectItem>
                          <SelectItem value="welcome">Welcome</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      className="col-span-3"
                      placeholder="Template name"
                      onChange={(e) => setNewTemplateName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => {
                    setNewTemplateType('');
                    setNewTemplateName('');
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" onClick={() => {
                    if (!newTemplateType) {
                      toast({
                        title: 'Template type required',
                        description: 'Please select a template type',
                        variant: 'destructive',
                      });
                      return;
                    }
                    
                    const name = newTemplateName || (
                      TEMPLATE_CATEGORIES
                        .find(c => {
                          const subcategory = c.subcategories.find(s => newTemplateType.includes(s.name));
                          return subcategory != null;
                        })?.subcategories
                        .find(s => newTemplateType.includes(s.name))?.label || 'New Template'
                    );
                    
                    const category = newTemplateType.includes('welcome') || newTemplateType.includes('password-reset') || newTemplateType.includes('verification') 
                      ? 'authentication' 
                      : newTemplateType.includes('reminder') 
                        ? 'transactional' 
                        : 'marketing';
                      
                    createNewTemplate(newTemplateType, name, category);
                    
                    setNewTemplateType('');
                    setNewTemplateName('');
                  }}>
                    Create Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                        className="mr-2"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setTemplateToRename(template);
                              setNewTemplateNameInput(template.name);
                              setShowRenameDialog(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicateTemplate(template.id, template.name)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => {
                              setTemplateToDelete(template);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the template "{templateToDelete?.name}"? 
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteTemplate} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showRenameDialog} onOpenChange={(isOpen) => {
          setShowRenameDialog(isOpen);
          if (!isOpen) {
            setTemplateToRename(null);
            setNewTemplateNameInput('');
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Template</DialogTitle>
              <DialogDescription>
                Enter a new name for the template "{templateToRename?.name}".
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-template-name" className="text-right">
                  New Name
                </Label>
                <Input
                  id="new-template-name"
                  value={newTemplateNameInput}
                  onChange={(e) => setNewTemplateNameInput(e.target.value)}
                  className="col-span-3"
                  placeholder="Enter new template name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRenameTemplate} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Rename Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }
  
  // Render template editor
  if (view === 'edit' && selectedTemplate) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col w-full">
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
              onClick={() => {
                console.log('Test Send button clicked directly');
                // Direct state update bypassing any complex logic
                setView('test');
                
                // Provide user feedback
                toast({
                  title: 'Test Send',
                  description: 'Loading test send form...',
                });
              }}
            >
              <Send className="w-4 h-4 mr-1" />
              Test Send
            </Button>
            
            <Button 
              id="save-button"
              variant="outline" 
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className={isSaving ? 'opacity-70 cursor-not-allowed' : ''}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Super simple Unlayer editor following the article EXACTLY */}
        <div className="flex-1 overflow-hidden w-full">
          <UnlayerEmailEditor 
            templateId={selectedTemplate?.id}
            initialHtml={editedHtml}
            initialDesign={designJson}
            onSave={async (html, design) => {
              if (!selectedTemplate) {
                console.error('Cannot save: no template selected');
                return false;
              }
              
              // Log what we received from Unlayer
              console.log('Received from Unlayer editor:', {
                html_length: html?.length || 0,
                design_type: typeof design,
                has_design: !!design
              });
              
              // Direct save function that uses the HTML and design directly from Unlayer
              // This bypasses React state timing issues that were preventing saves
              const saveDirectContent = async (htmlContent: string, designData: any) => {
                if (!selectedTemplate) return false;
                
                try {
                  // Set loading state
                  setIsSaving(true);
                  const saveButton = document.getElementById('save-button');
                  if (saveButton) saveButton.classList.add('saving');
                  
                  // Prepare payload directly from the parameters
                  const payload = {
                    templateId: selectedTemplate.id,
                    htmlTemplate: htmlContent,
                    design: designData,
                    category: selectedTemplate.category,
                    subcategory: selectedTemplate.subcategory || null,
                    version: selectedTemplate.version || 1
                  };
                  
                  // Save directly to API
                  const response = await fetch('/api/admin/email-templates', {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload),
                  });
                  
                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to save template');
                  }
                  
                  // Success handling
                  toast({
                    title: 'Template Saved',
                    description: `${selectedTemplate.name} saved successfully`,
                    variant: 'default',
                  });
                  
                  // Update UI to reflect success
                  if (saveButton) {
                    saveButton.classList.add('success');
                    setTimeout(() => saveButton.classList.remove('success'), 1500);
                  }
                  
                  // Update state to match what we saved
                  setEditedHtml(htmlContent);
                  setDesignJson(designData);
                  
                  // Refresh data
                  await fetchTemplate(selectedTemplate.id);
                  
                  return true;
                } catch (err) {
                  console.error('Error saving template:', err);
                  
                  // Show error toast
                  toast({
                    title: 'Save Failed',
                    description: err instanceof Error ? err.message : 'Failed to save template',
                    variant: 'destructive',
                  });
                  
                  // Update UI to reflect error
                  const saveButton = document.getElementById('save-button');
                  if (saveButton) {
                    saveButton.classList.add('error');
                    setTimeout(() => saveButton.classList.remove('error'), 1500);
                  }
                  
                  return false;
                } finally {
                  // Reset loading state
                  setIsSaving(false);
                  const saveButton = document.getElementById('save-button');
                  if (saveButton) saveButton.classList.remove('saving');
                }
              };
              
              // Call our direct save function with the latest HTML and design
              return await saveDirectContent(html, design);
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
  
  // We've moved the variable extraction logic to the view state tracking useEffect above
  
  // Render test send form
  if (view === 'test' && selectedTemplate) {
    console.log('TEST VIEW ACTIVE - Conditions for rendering test form: selectedTemplate exists?', !!selectedTemplate);
    console.log('Template data for test:', {
      id: selectedTemplate.id,
      name: selectedTemplate.name
    });
    
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={() => setView('edit')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Editor
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
              key={Object.keys(previewVariables).length} // Force remount when variable count changes
              templateId={selectedTemplate.id}
              templateName={selectedTemplate.name}
              variables={previewVariables}
              variableInfo={getTemplateVariableDocs(selectedTemplate.id)}
              onCancel={() => setView('edit')}
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
