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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { extractVariablesFromContent, getStandardVariableDefaults, substituteVariables } from '@/lib/services/email/template-utils';
import { Smartphone, Tablet, Monitor, RotateCw, CheckCircle2, Variable, Eye, Mail, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  buttonStyles, 
  typography, 
  transitions, 
  cardStyles 
} from '../ui-utils';

export interface LivePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialHtml: string;
  initialSubject: string;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface DeviceConfig {
  name: string;
  icon: JSX.Element;
  width: string;
  height: string;
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
  const [activeDevice, setActiveDevice] = useState<DeviceType>('desktop');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [recentlyUpdatedVariable, setRecentlyUpdatedVariable] = useState<string | null>(null);

  // Device settings
  const deviceConfigs: Record<DeviceType, DeviceConfig> = {
    desktop: {
      name: 'Desktop',
      icon: <Monitor className="h-4 w-4" />,
      width: '100%',
      height: '100%'
    },
    tablet: {
      name: 'Tablet',
      icon: <Tablet className="h-4 w-4" />,
      width: '768px',
      height: '1024px'
    },
    mobile: {
      name: 'Mobile',
      icon: <Smartphone className="h-4 w-4" />,
      width: '375px',
      height: '667px'
    }
  };

  useEffect(() => {
    if (isOpen && initialHtml) {
      const vars = extractVariablesFromContent(initialHtml);
      setExtractedVariables(vars);
      // Use getStandardVariableDefaults for consistency for sample data.
      setVariableValues(getStandardVariableDefaults()); 
    }
  }, [isOpen, initialHtml]);

  useEffect(() => {
    if (initialHtml && Object.keys(variableValues).length > 0) {
      // If there are specific values entered by the user (or from defaults),
      // use them for substitution. Otherwise, `substituteVariables` will use empty strings for missing ones.
      setPreviewHtml(substituteVariables(initialHtml, variableValues));
    } else if (initialHtml) {
      // If no variables or values, show initial HTML.
      setPreviewHtml(initialHtml);
    }
  }, [initialHtml, variableValues]);

  const handleVariableChange = (variableName: string, value: string) => {
    setVariableValues(prev => ({ ...prev, [variableName]: value }));
    
    // Set recently updated variable for visual feedback
    setRecentlyUpdatedVariable(variableName);
    setTimeout(() => setRecentlyUpdatedVariable(null), 1500);
  };

  const handleDeviceChange = (device: DeviceType) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveDevice(device);
      setIsTransitioning(false);
    }, 150);
  };

  const resetVariablesToDefaults = () => {
    setVariableValues(getStandardVariableDefaults());
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[90vh] h-[90vh] flex flex-col">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Live Preview: {initialSubject}
              </DialogTitle>
              <DialogDescription>
                Enter sample data for the detected variables to see a live preview of how your email will look.
              </DialogDescription>
            </div>
            <Badge variant="outline" className="bg-secondary/10 text-secondary">
              {activeDevice.charAt(0).toUpperCase() + activeDevice.slice(1)} View
            </Badge>
          </div>
        </DialogHeader>
        
        <div className="flex-grow min-h-0 flex flex-col">
          {/* Device Selector */}
          <div className="flex justify-center mb-3 relative">
            <div className={cn(
              "inline-flex items-center justify-center p-1 rounded-md bg-muted/80",
              "border border-border shadow-sm"
            )}>
              {Object.entries(deviceConfigs).map(([device, config]) => (
                <Button
                  key={device}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-sm gap-1.5 px-3 py-1.5",
                    activeDevice === device ? "bg-background shadow-sm" : "hover:bg-background/80",
                    "transition-all duration-200"
                  )}
                  onClick={() => handleDeviceChange(device as DeviceType)}
                >
                  {config.icon}
                  <span>{config.name}</span>
                </Button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-grow min-h-0">
            {/* Variables Panel */}
            <div className="md:col-span-1 flex flex-col border rounded-lg overflow-hidden">
              <div className="bg-muted/50 p-3 border-b">
                <h3 className={cn(
                  typography.h4, 
                  "flex items-center gap-1.5 text-primary font-medium"
                )}>
                  <Variable className="h-4 w-4" />
                  Variables
                </h3>
              </div>
              
              <div className="flex-grow overflow-y-auto p-3 space-y-4">
                {extractedVariables.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4 space-y-2">
                    <Info className="h-8 w-8 text-muted-foreground opacity-70" />
                    <p className={typography.muted}>No variables detected in email content.</p>
                  </div>
                )}
                
                {extractedVariables.map(variable => (
                  <div key={variable} className={cn(
                    "space-y-2 p-3 rounded-md",
                    recentlyUpdatedVariable === variable 
                      ? "bg-primary/5 border border-primary/20 transition-colors duration-300" 
                      : "border border-transparent hover:border-border hover:bg-muted/30"
                  )}>
                    <div className="flex items-center justify-between">
                      <Label 
                        htmlFor={`var-${variable}`}
                        className="font-medium flex items-center gap-1"
                      >
                        {variable}
                        {recentlyUpdatedVariable === variable && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-1 animate-in fade-in" />
                        )}
                      </Label>
                      
                    </div>
                    <Input
                      id={`var-${variable}`}
                      value={variableValues[variable] || ''}
                      onChange={(e) => handleVariableChange(variable, e.target.value)}
                      placeholder={`Sample for ${variable}`}
                      className="border-input bg-background"
                    />
                  </div>
                ))}
              </div>
              
              {extractedVariables.length > 0 && (
                <div className="p-3 border-t bg-muted/30">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={cn(buttonStyles.outline, "w-full gap-1.5")}
                    onClick={resetVariablesToDefaults}
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Reset to Defaults
                  </Button>
                </div>
              )}
            </div>
            
            {/* Preview Panel */}
            <div className="md:col-span-3 flex flex-col border rounded-lg overflow-hidden">
              <div className="bg-muted/50 p-3 border-b flex items-center justify-between">
                <h3 className={cn(
                  typography.h4, 
                  "flex items-center gap-1.5 text-primary font-medium"
                )}>
                  <Mail className="h-4 w-4" />
                  Email Preview
                </h3>
                <div className="text-sm text-muted-foreground">
                  Subject: <span className="font-medium">{initialSubject}</span>
                </div>
              </div>
              
              <div className="flex-grow overflow-auto bg-background p-4 flex justify-center items-start">
                <div 
                  className={cn(
                    "rounded-md border bg-white shadow-md overflow-auto transition-all duration-300 ease-in-out",
                    isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"
                  )}
                  style={{
                    width: deviceConfigs[activeDevice].width,
                    height: deviceConfigs[activeDevice].height,
                    maxHeight: "100%",
                    maxWidth: "100%"
                  }}
                >
                  <div
                    className="prose prose-sm max-w-none p-4"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-auto pt-4">
          <DialogClose asChild>
            <Button 
              type="button" 
              variant="outline"
              className={buttonStyles.outline}
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 