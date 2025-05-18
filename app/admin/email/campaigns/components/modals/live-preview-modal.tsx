'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { extractVariablesFromContent, getStandardVariableDefaults, substituteVariables } from '@/lib/services/email/template-utils';

export interface LivePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialHtml: string;
  initialSubject: string;
}

export function LivePreviewModal({
  isOpen,
  onClose,
  initialHtml,
  initialSubject,
}: LivePreviewModalProps) {
  const [extractedVariables, setExtractedVariables] = useState<string[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = useState<string>('');

  useEffect(() => {
    if (isOpen && initialHtml) {
      const vars = extractVariablesFromContent(initialHtml);
      setExtractedVariables(vars);
      // Use getStandardVariableDefaults for consistency for sample data.
      // The `vars` (extractedVariables) are used to determine which input fields to show for customization.
      setVariableValues(getStandardVariableDefaults()); 
    }
  }, [isOpen, initialHtml]);

  useEffect(() => {
    if (initialHtml && Object.keys(variableValues).length > 0) {
      // If there are specific values entered by the user (or from defaults),
      // use them for substitution. Otherwise, `substituteVariables` will use empty strings for missing ones.
      setPreviewHtml(substituteVariables(initialHtml, variableValues));
    } else if (initialHtml) {
      // If no variables or values (e.g. variableValues is empty because getStandardVariableDefaults returned empty or initialHtml had no vars),
      // show initial HTML. substituteVariables would also achieve this if variableValues is empty.
      setPreviewHtml(initialHtml);
    }
  }, [initialHtml, variableValues]);

  const handleVariableChange = (variableName: string, value: string) => {
    setVariableValues(prev => ({ ...prev, [variableName]: value }));
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Live Email Preview: {initialSubject}</DialogTitle>
          <DialogDescription>
            Enter sample data for the detected variables to see a live preview. Changes here are not saved.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow min-h-0">
          <div className="md:col-span-1 space-y-4 overflow-y-auto pr-2 border-r">
            <h3 className="text-lg font-medium mb-2">Variables</h3>
            {extractedVariables.length === 0 && <p className="text-sm text-muted-foreground">No variables detected in content.</p>}
            {extractedVariables.map(variable => (
              <div key={variable} className="space-y-1">
                <Label htmlFor={`var-${variable}`}>{variable}</Label>
                <Input
                  id={`var-${variable}`}
                  value={variableValues[variable] || ''} // Use value from variableValues, which might be from standard defaults or user input
                  onChange={(e) => handleVariableChange(variable, e.target.value)}
                  placeholder={`Sample for ${variable}`}
                />
              </div>
            ))}
          </div>
          <div className="md:col-span-2 overflow-y-auto pl-2">
            <h3 className="text-lg font-medium mb-2">Preview</h3>
            <div
              className="border rounded-md p-4 bg-white h-full min-h-[300px] prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
        <DialogFooter className="mt-auto pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 