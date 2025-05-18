'use client';

import React, { useImperativeHandle, useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import UnlayerEmailEditor, { EditorRef as UnlayerEditorRef } from '@/app/admin/email-templates/unlayer-email-editor';
import { EmailCampaign } from '@/lib/supabase/data-access/campaign-management';
import { Loader2, Save, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useCampaignStore } from '@/lib/hooks/use-campaign-store';
import { extractVariablesFromContent, getStandardVariableDefaults } from '@/lib/services/email/template-utils';

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
      onNewCampaignCreated,
    } = props;

    const { toast } = useToast();
    const { createCampaign, updateCampaign, fetchCampaign } = useCampaignStore();

    // Internal state for the editor
    const unlayerEditorRef = useRef<UnlayerEditorRef>(null);
    const [isEditorReady, setIsEditorReady] = useState(false);
    const [editorKey, setEditorKey] = useState(Date.now()); // Used to force re-render of Unlayer
    const [isSavingDraft, setIsSavingDraft] = useState(false);

    // Internal state for variables
    const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
    const [variableValues, setVariableValues] = useState<Record<string, string>>({});

    // Store initial values from prop to compare for re-initialization
    const [initialDesignLoaded, setInitialDesignLoaded] = useState<any>(null);
    const [initialHtmlLoaded, setInitialHtmlLoaded] = useState<string | null>(null);

    useEffect(() => {
      if (currentCampaign) {
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
    }, [currentCampaign?.campaign_design_json, currentCampaign?.campaign_html_body, currentCampaign?.id, initialDesignLoaded, initialHtmlLoaded]);

    // New useEffect for managing variables based on campaign content or explicit trigger
    useEffect(() => {
      const updateVars = (htmlContent: string | null | undefined) => {
        if (htmlContent) {
          const vars = extractVariablesFromContent(htmlContent);
          setDetectedVariables(vars);
          // Only set defaults if variables are detected and current values are empty,
          // to avoid overwriting user-modified preview values if we were to implement that here.
          // For now, always setting defaults if vars exist.
          if (vars.length > 0) {
            setVariableValues(getStandardVariableDefaults());
          } else {
            setVariableValues({});
          }
        } else {
          setDetectedVariables([]);
          setVariableValues({});
        }
      };

      // Initial load from currentCampaign
      if (currentCampaign?.campaign_html_body) {
        updateVars(currentCampaign.campaign_html_body);
      }
      
      // This effect will also re-run if onContentChangedForVariableExtraction identity changes,
      // but its primary job is to call updateVars if the callback itself is invoked.
      // The actual HTML for onContentChangedForVariableExtraction comes from its invocation.
      // This might be slightly redundant if currentCampaign.campaign_html_body is updated by parent
      // at the same time onContentChangedForVariableExtraction is called.
      
      // The `onContentChangedForVariableExtraction` prop should ideally be an Effect hook itself if it were complex,
      // or the logic it performs should be here.

    }, [currentCampaign?.campaign_html_body]);

    const getEditorContentInternal = async (): Promise<{ html: string; design: any } | null> => {
      if (unlayerEditorRef.current) {
        return new Promise((resolve, reject) => {
          // Added non-null assertion as it's checked above
          unlayerEditorRef.current!.exportHtml(data => { 
            if (data && data.design && data.html) {
              resolve(data);
            } else {
              reject(new Error('Failed to export valid data from Unlayer editor.'));
            }
          });
        });
      }
      console.warn('getEditorContentInternal: unlayerEditorRef not available');
      return null;
    };

    useImperativeHandle(ref, () => ({
      getInnerEditorContent: getEditorContentInternal, // Use the internal function
      dangerouslyUpdateEditorContent: (newContent: { designJSON: any; htmlContent: string | null }) => {
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

    const handleEditorLoad = () => {
      console.log('ContentTabContent: Unlayer Editor Loaded.');
      setIsEditorReady(true);
      // Extract variables when editor is ready with content
      if (unlayerEditorRef.current) {
        unlayerEditorRef.current.exportHtml(data => {
          if (data && data.html) {
            const vars = extractVariablesFromContent(data.html);
            setDetectedVariables(vars);
            if (vars.length > 0) {
              setVariableValues(getStandardVariableDefaults());
            } else {
              setVariableValues({});
            }
          }
        });
      }
    };
    
    const internalHandleSaveCampaign = async () => {
      if (!isEditorReady) {
        toast({ title: 'Editor Not Ready', description: 'Editor is still loading. Please wait.', variant: 'destructive' });
        return;
      }
      if (!currentCampaign || !unlayerEditorRef.current) {
        toast({ title: 'Error', description: 'Cannot save: campaign data or editor not available.', variant: 'destructive' });
        return;
      }
    
      setIsSavingDraft(true);
      let latestHtml: string | null = null;
      let latestDesign: any = null;
    
      try {
        const exportedData = await getEditorContentInternal(); // Use the internal function directly
        if (!exportedData) throw new Error('Could not get content from editor.'); // Simplified error
        latestHtml = exportedData.html;
        latestDesign = exportedData.design;
        
        // Notify parent about content change for variable extraction AFTER successful export
        if (latestHtml) {
            const vars = extractVariablesFromContent(latestHtml);
            setDetectedVariables(vars);
            if (vars.length > 0) {
              setVariableValues(getStandardVariableDefaults());
            } else {
              setVariableValues({});
            }
        }

      } catch (exportError: any) {
        toast({ title: 'Editor Export Error', description: exportError.message || 'Could not get latest content.', variant: 'destructive' });
        setIsSavingDraft(false);
        return; 
      }
    
      const campaignDataToSave: Partial<EmailCampaign> = {
        name: currentCampaign.name, 
        subject: currentCampaign.subject, 
        selected_template_id: currentCampaign.selected_template_id,
        campaign_html_body: latestHtml,
        campaign_design_json: latestDesign,
        status: 'draft', 
      };
      
      try {
        if (campaignId === 'new') {
          const newCampaign = await createCampaign(campaignDataToSave as Omit<EmailCampaign, 'id' | 'created_at' | 'updated_at'>);
          toast({ title: 'Campaign Draft Created', description: 'New campaign draft saved successfully.' });
          if (onNewCampaignCreated) onNewCampaignCreated(newCampaign.id);
        } else {
          await updateCampaign(campaignId, campaignDataToSave); // campaignId is currentCampaign.id
          toast({ title: 'Campaign Draft Saved', description: 'Your campaign draft has been updated.' });
          await fetchCampaign(campaignId); // Re-fetch to ensure UI consistency
        }
      } catch (error: any) {
        toast({ title: 'Error Saving Draft', description: error.message || 'Failed to save draft.', variant: 'destructive' });
      } finally {
        setIsSavingDraft(false);
      }
    };


    if (!currentCampaign && campaignId !== 'new') { // Stricter check for existing campaigns
      return (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-2 text-muted-foreground">Loading campaign data...</p>
        </div>
      );
    }
    
    // For 'new' campaign, currentCampaign might be null until basic details are set by parent
    // or it might be pre-filled with defaults. Unlayer should still render if campaignId is 'new'.
    const designToLoad = currentCampaign?.campaign_design_json ?? initialDesignLoaded ?? undefined;
    const htmlToLoad = currentCampaign?.campaign_html_body ?? initialHtmlLoaded ?? undefined;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            <Button
              onClick={internalHandleSaveCampaign}
              disabled={isSavingDraft || !isEditorReady}
              variant="outline"
            >
              {isSavingDraft ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </>
              )}
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={() => setIsTemplateModalOpen(true)}
              variant="outline"
            >
              <FileText className="mr-2 h-4 w-4" /> Load from Template
            </Button>
          </div>
        </div>

        {(campaignId === 'new' || designToLoad !== undefined) ? ( // Render editor if new or design is available
          <div className="relative h-full">
            {!isEditorReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading editor...</p>
                </div>
              </div>
            )}
            <UnlayerEmailEditor
              key={editorKey}
              ref={unlayerEditorRef}
              onLoad={handleEditorLoad}
              initialDesign={designToLoad}
              initialHtml={htmlToLoad}
              minHeight="600px"
            />
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-md min-h-[300px] flex flex-col justify-center items-center">
            <p>No content loaded. Current campaign might be missing design JSON.</p>
            <p className="text-sm">Load a template or ensure campaign data is fully fetched if this is an existing campaign.</p>
          </div>
        )}
      </div>
    );
  }
);

ContentTabContent.displayName = 'ContentTabContent'; 