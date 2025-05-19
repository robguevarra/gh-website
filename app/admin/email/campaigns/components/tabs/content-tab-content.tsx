'use client';

import React, { useImperativeHandle, useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import UnlayerEmailEditor, { EditorRef as UnlayerEditorRef } from '@/app/admin/email-templates/unlayer-email-editor';
import { EmailCampaign } from '@/lib/supabase/data-access/campaign-management';
import { Loader2, Save, FileText, RefreshCw, Image, Info, Type } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useCampaignStore } from '@/lib/hooks/use-campaign-store';
import { extractVariablesFromContent, getStandardVariableDefaults } from '@/lib/services/email/template-utils';
import { cn } from '@/lib/utils';
import { 
  cardStyles, 
  buttonStyles, 
  typography, 
  transitions, 
  spacing,
  inputStyles 
} from '../ui-utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VariableListModal } from '@/components/admin/email/VariableListModal';

// Define and export the Ref type for this component
export interface ContentTabContentRef {
  getInnerEditorContent: () => Promise<{ html: string; design: any } | null>;
  // This method is to allow parent to trigger a content update, e.g., from template selection
  // It will cause the Unlayer editor to re-initialize with new content.
  dangerouslyUpdateEditorContent: (newContent: { designJSON: any; htmlContent: string | null }) => void;
}

export interface ContentTabContentProps {
  currentCampaign: EmailCampaign | null;
  campaignId: string;
  setIsTemplateModalOpen: (isOpen: boolean) => void;
  onNewCampaignCreated?: (newCampaignId: string) => void;
}

export const ContentTabContent = React.forwardRef<ContentTabContentRef, ContentTabContentProps>(
  (props, ref) => {
    const { 
      currentCampaign, 
      campaignId, 
      setIsTemplateModalOpen, 
      onNewCampaignCreated 
    } = props;
    
    const [isEditorReady, setIsEditorReady] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editorKey, setEditorKey] = useState<number>(Date.now()); // Used to force re-render of editor
    const [initialDesignLoaded, setInitialDesignLoaded] = useState<any>(null); // Track design JSON to prevent unnecessary re-renders
    const [initialHtmlLoaded, setInitialHtmlLoaded] = useState<string | null>(null); // Track HTML to prevent unnecessary re-renders
    const [subject, setSubject] = useState<string>(currentCampaign?.subject || '');
    
    const unlayerEditorRef = useRef<UnlayerEditorRef>(null);
    const { toast } = useToast();
    
    // For New Campaigns, using store to update is cleaner than prop callbacks in many cases
    const updateCampaign = useCampaignStore(state => state.updateCampaign);
    const createCampaign = useCampaignStore(state => state.createCampaign);

    useEffect(() => {
      if (currentCampaign) {
        // Update subject when campaign changes
        setSubject(currentCampaign.subject || '');
        
        // Only re-key the editor if the actual campaign's content has changed from what was last loaded
        // This prevents re-initializing if only other campaign metadata changes
        const designChanged = JSON.stringify(currentCampaign.campaign_design_json) !== JSON.stringify(initialDesignLoaded);
        const htmlChanged = currentCampaign.campaign_html_body !== initialHtmlLoaded;

        if ((currentCampaign.campaign_design_json && designChanged) || (currentCampaign.campaign_html_body && htmlChanged)) {
          console.log('ContentTabContent: Campaign content changed, re-keying editor.', currentCampaign.id);
          setIsEditorReady(false); // Reset ready state
          setEditorKey(Date.now());
          setInitialDesignLoaded(currentCampaign.campaign_design_json ?? null); // Ensure null if undefined
          setInitialHtmlLoaded(currentCampaign.campaign_html_body ?? null); // Ensure null if undefined
        } else if (!currentCampaign.campaign_design_json && initialDesignLoaded) {
          // Campaign content was cleared
          console.log('ContentTabContent: Campaign content cleared, re-keying editor.', currentCampaign.id);
          setIsEditorReady(false);
          setEditorKey(Date.now());
          setInitialDesignLoaded(null);
          setInitialHtmlLoaded(null);
        }
      }
    }, [currentCampaign?.campaign_design_json, currentCampaign?.campaign_html_body, currentCampaign?.id, currentCampaign?.subject, initialDesignLoaded, initialHtmlLoaded]);

    const handleEditorLoad = () => {
      console.log('ContentTabContent: Unlayer editor loaded');
      setIsEditorReady(true);
    };

    const handleSaveContent = async () => {
      if (!unlayerEditorRef.current || !currentCampaign) return;
  
      try {
        setIsSaving(true);
        
        // Get design JSON from editor
        let editorContent: any;
        try {
          editorContent = await new Promise<any>((resolve, reject) => {
            const editorInstance = unlayerEditorRef.current?.getEditorInstance();
            if (!editorInstance) {
              reject(new Error("Editor instance not available"));
              return;
            }
            
            editorInstance.saveDesign((design: any) => {
              if (design) {
                resolve(design);
              } else {
                reject(new Error("Could not retrieve design from editor"));
              }
            });
          });
        } catch (error) {
          throw new Error("Could not retrieve content from editor");
        }
        
        // Get HTML from editor
        let editorHtml: { html: string; design?: any };
        try {
          editorHtml = await new Promise<{ html: string; design?: any }>((resolve, reject) => {
            const editorInstance = unlayerEditorRef.current?.getEditorInstance();
            if (!editorInstance) {
              reject(new Error("Editor instance not available"));
              return;
            }
            
            editorInstance.exportHtml((data) => {
              if (data && data.html) {
                resolve(data);
              } else {
                reject(new Error("Could not generate HTML from editor"));
              }
            });
          });
        } catch (error) {
          throw new Error("Could not generate HTML from editor");
        }
        
        // For new campaigns, we need to create it first
        if (campaignId === 'new') {
          let newlyCreatedCampaignId = "";
          try {
            // Create a new campaign with the editor content
            const result = await createCampaign({
              name: currentCampaign.name || 'New Campaign', 
              subject: subject || 'New Campaign Subject',
              campaign_design_json: editorContent,
              campaign_html_body: editorHtml.html,
              status: 'draft'
            });
            
            newlyCreatedCampaignId = result.id;
            
            toast({
              title: "Campaign Created",
              description: "New campaign has been created with your content.",
            });
            
            // Notify parent so it can redirect to the new campaign's page
            if (onNewCampaignCreated) onNewCampaignCreated(newlyCreatedCampaignId);
          } catch (createError) {
            console.error('Error creating new campaign:', createError);
            toast({
              title: "Error",
              description: "Failed to create new campaign with your content.",
              variant: "destructive"
            });
          }
        } else {
          // Existing campaign, just update the content
          try {
            await updateCampaign(campaignId, {
              subject,
              campaign_design_json: editorContent,
              campaign_html_body: editorHtml.html
            });
            
            // Update what we consider "loaded" to prevent unnecessary re-renders
            setInitialDesignLoaded(editorContent);
            setInitialHtmlLoaded(editorHtml.html);
            
            toast({
              title: "Content Saved",
              description: "Your campaign content has been saved.",
            });
          } catch (updateError) {
            console.error('Error updating campaign content:', updateError);
            toast({
              title: "Error",
              description: "Failed to save your campaign content.",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error('ContentTabContent: Error getting editor content:', error);
        toast({
          title: "Error",
          description: "There was a problem retrieving content from the editor. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsSaving(false);
      }
    };

    useImperativeHandle(ref, () => ({
      getInnerEditorContent: async () => {
        if (!unlayerEditorRef.current) return null;
        try {
          const design: any = await new Promise((resolve, reject) => {
            const editorInstance = unlayerEditorRef.current?.getEditorInstance();
            if (!editorInstance) {
              reject(new Error("Editor instance not available"));
              return;
            }
            
            editorInstance.saveDesign((design: any) => {
              if (design) {
                resolve(design);
              } else {
                reject(new Error("Could not retrieve design from editor"));
              }
            });
          });
          
          const htmlExport: { html: string } = await new Promise((resolve, reject) => {
            const editorInstance = unlayerEditorRef.current?.getEditorInstance();
            if (!editorInstance) {
              reject(new Error("Editor instance not available"));
              return;
            }
            
            editorInstance.exportHtml((data) => {
              if (data && data.html) {
                resolve(data);
              } else {
                reject(new Error("Could not generate HTML from editor"));
              }
            });
          });
          
          return { design, html: htmlExport.html };
        } catch (error) {
          console.error('ContentTabContent: Error in getInnerEditorContent:', error);
          return null;
        }
      },
      
      dangerouslyUpdateEditorContent: 
      (newContent: { designJSON: any; htmlContent: string | null }) => {
        // This method is called by the parent when a template is selected.
        // It forces the editor to re-initialize with this new content.
        console.log('ContentTabContent: dangerouslyUpdateEditorContent called', newContent);
        setIsEditorReady(false); // Editor will re-load
        setInitialDesignLoaded(newContent.designJSON); // Update what we consider "loaded"
        setInitialHtmlLoaded(newContent.htmlContent);
        // Forcing Unlayer to take new initial values by changing its key
        setEditorKey(prevKey => prevKey + 1); 
        // The UnlayerEmailEditor component itself will then use these new values from currentCampaign
        // This assumes the parent (CampaignDetail) updates currentCampaign with this new content first,
        // and then calls this to ensure re-initialization.
        // OR, this component directly updates the Unlayer editor if it could accept new props.
        // Unlayer's typical pattern is re-initialization via key change or direct loadDesign/loadHtml methods.
        // Given our setup, re-keying using new initial props on currentCampaign is cleaner.
        // The parent must update `currentCampaign` THEN call this.
        // Actually, it's better if this function itself triggers the update to `currentCampaign` via a callback
        // or directly if it has the update function.
        // Let's assume for now parent updates `currentCampaign` from `handleTemplateSelected`, then this is called.
        // The key change will pick up the new `initialDesign` and `initialHtml` passed to UnlayerEmailEditor below.
      }
    }));

    const handleOpenTemplateModal = () => {
      setIsTemplateModalOpen(true);
    };

    // Select appropriate content to load
    const designToLoad = currentCampaign?.campaign_design_json || undefined;
    const htmlToLoad = currentCampaign?.campaign_html_body || undefined;

    const extractedVariables = 
      currentCampaign?.campaign_html_body 
        ? extractVariablesFromContent(currentCampaign.campaign_html_body) 
        : [];

    return (
      <div className={cn("space-y-6", transitions.fadeIn)}>
        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b">
          <div className="flex items-center gap-2">
            <h3 className={typography.h4}>Email Content</h3>
            {extractedVariables.length > 0 && (
              <Badge variant="outline" className="ml-2 bg-secondary/10">
                {extractedVariables.length} Variable{extractedVariables.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className={cn(buttonStyles.outline, "gap-1.5")}
              onClick={handleOpenTemplateModal}
            >
              <Image className="h-4 w-4" />
              Select Template
            </Button>
            
            <Button
              onClick={handleSaveContent}
              size="sm"
              className={cn(buttonStyles.primary, "gap-1.5")}
              disabled={isSaving || !isEditorReady}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Content
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Subject Field */}
        <div className={cn("space-y-2", transitions.fadeIn)}>
          <Label htmlFor="email-subject" className="flex items-center gap-1.5">
            <Type className="h-4 w-4 text-primary" />
            Email Subject
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject line..."
              className={cn(inputStyles.default, "flex-1")}
            />
            <VariableListModal />
          </div>
          <p className={typography.subtle}>
            A compelling subject line significantly impacts open rates. Keep it concise and relevant.
          </p>
        </div>

        {/* Variables Info - if found in content */}
        {extractedVariables.length > 0 && (
          <div className={cn("p-3 border rounded-md bg-muted/30", transitions.fadeIn)}>
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className={typography.p}>
                  <span className="font-medium">Variables detected:</span>{' '}
                  {extractedVariables.map((v, i) => (
                    <span key={v} className="inline-flex items-center mx-1 px-1.5 py-0.5 rounded-md bg-muted text-sm font-mono">
                      {v}
                    </span>
                  ))}
                </p>
                <p className={cn(typography.subtle, "mt-1")}>
                  These variables will be replaced with actual values when emails are sent.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Email Editor */}
        <div className={cn("mt-4 transition-all duration-300", isEditorReady ? "opacity-100" : "opacity-70")}>
          {/* Editor Container with improved styling */}
          <div className={cn("border rounded-lg overflow-hidden", cardStyles.elevated)}>
            {(campaignId === 'new' || designToLoad !== undefined) ? ( 
              <div className="relative h-full rounded-lg">
                {!isEditorReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm z-10 rounded-lg transition-opacity duration-300">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <div className="absolute inset-0 h-10 w-10 animate-pulse opacity-30 rounded-full bg-primary/20" />
                      </div>
                      <p className={cn(typography.p, "text-center")}>
                        Initializing email editor<span className="animate-pulse">...</span>
                      </p>
                      <p className={typography.subtle}>This may take a moment</p>
                    </div>
                  </div>
                )}
                
                <UnlayerEmailEditor
                  key={editorKey}
                  ref={unlayerEditorRef}
                  onLoad={handleEditorLoad}
                  initialDesign={designToLoad}
                  initialHtml={htmlToLoad}
                  minHeight="700px"
                />
              </div>
            ) : (
              <div className={cn(
                "flex flex-col justify-center items-center py-12 px-6 rounded-lg", 
                transitions.fadeIn,
                "bg-muted/20 border-dashed border-2"
              )}>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-primary/60" />
                </div>
                <h3 className={cn(typography.h3, "text-center mb-2")}>No Content Found</h3>
                <p className={cn(typography.p, "text-center max-w-md mb-6")}>
                  Get started by selecting a template or creating your content from scratch in the editor.
                </p>
                <Button 
                  onClick={handleOpenTemplateModal}
                  className={cn(buttonStyles.secondary, "gap-1.5")}
                >
                  <Image className="h-4 w-4" />
                  Choose a Template
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ContentTabContent.displayName = 'ContentTabContent'; 