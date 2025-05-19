'use client';

import React, { useState } from 'react';
import { ALL_EMAIL_VARIABLES, EmailVariable } from '@/lib/services/email/template-utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from 'sonner';
import { Copy } from 'lucide-react';

interface VariableListModalProps {
  onInsertVariable?: (placeholder: string) => void; // Optional: If modal directly inserts into an editor
}

const categorizedVariables = ALL_EMAIL_VARIABLES.reduce((acc, variable) => {
  const category = variable.category;
  if (!acc[category]) {
    acc[category] = [];
  }
  acc[category].push(variable);
  return acc;
}, {} as Record<string, EmailVariable[]>);

const categories = Object.keys(categorizedVariables);

export function VariableListModal({ onInsertVariable }: VariableListModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = (placeholder: string) => {
    navigator.clipboard.writeText(placeholder)
      .then(() => {
        toast.success(`Copied "${placeholder}" to clipboard!`);
      })
      .catch(err => {
        toast.error('Failed to copy variable.');
        console.error('Failed to copy text: ', err);
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">View Available Variables</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Available Email Variables</DialogTitle>
          <DialogDescription>
            Copy these placeholders to personalize your email campaigns. They will be replaced with actual data when the email is sent.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue={categories[0]} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            {categories.map(category => (
              <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
            ))}
          </TabsList>

          {categories.map(category => (
            <TabsContent key={category} value={category}>
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <div className="space-y-4">
                  {categorizedVariables[category].map((variable) => (
                    <div key={variable.placeholder} className="p-3 border rounded-md shadow-sm bg-slate-50 dark:bg-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">{variable.name}</h4>
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(variable.placeholder)}
                          title={`Copy ${variable.placeholder}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                        <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-sm text-xs">{variable.placeholder}</code>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">{variable.description}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Example: <span className='italic'>{variable.sampleValue}</span></p>
                      {variable.notes && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Note: {variable.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter className="mt-6">
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