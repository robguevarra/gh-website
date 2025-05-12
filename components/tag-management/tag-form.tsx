// components/tag-management/tag-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTagStore } from "@/lib/hooks/use-tag-store";
import type { Tag, TagType } from "@/lib/supabase/data-access/tags";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const NONE_VALUE_ID = "---NONE---"; // Placeholder for null selection

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(100),
  type_id: z.string().uuid({ message: "Please select a valid tag type." })
    .or(z.literal(NONE_VALUE_ID)) // Allow our placeholder
    .optional()
    .nullable(),
  parent_id: z.string().uuid({ message: "Invalid parent tag ID." })
    .or(z.literal(NONE_VALUE_ID)) // Allow our placeholder
    .optional()
    .nullable(),
  metadata: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true; // Allow empty string for no metadata
    try {
      JSON.parse(val);
      return true;
    } catch (e) {
      return false;
    }
  }, { message: "Metadata must be valid JSON or empty." }),
});

type TagFormValues = z.infer<typeof formSchema>;

interface TagFormProps {
  initialData?: Partial<Tag>;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TagForm({ initialData, onSuccess, onCancel }: TagFormProps) {
  const {
    tagTypes, // For select dropdown
    tags,     // For parent tag select dropdown
    fetchTagTypes,
    fetchTags, // Fetch all tags for parent selection (consider performance for many tags)
    createTag,
    updateTag,
    isLoadingTags,
    isLoadingTagTypes,
    tagsError,
  } = useTagStore();
  
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEditing = !!initialData?.id;

  useEffect(() => {
    // Fetch necessary data for dropdowns if not already loaded
    if (!tagTypes.length) fetchTagTypes();
    // Fetch all tags for parent selection. For large datasets, might need a searchable select or pagination.
    if (!tags.length) fetchTags(); 
  }, [fetchTagTypes, fetchTags, tagTypes.length, tags.length]);

  const form = useForm<TagFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      type_id: initialData?.type_id === null ? NONE_VALUE_ID : (initialData?.type_id || NONE_VALUE_ID),
      parent_id: initialData?.parent_id === null ? NONE_VALUE_ID : (initialData?.parent_id || NONE_VALUE_ID),
      metadata: initialData?.metadata ? JSON.stringify(initialData.metadata, null, 2) : "",
    },
  });

  async function onSubmit(values: TagFormValues) {
    setSubmitError(null);
    const payload = {
      ...values,
      type_id: values.type_id === NONE_VALUE_ID ? null : values.type_id,
      parent_id: values.parent_id === NONE_VALUE_ID ? null : values.parent_id,
      metadata: values.metadata ? JSON.parse(values.metadata) : null,
    };

    let result;
    if (isEditing && initialData?.id) {
      result = await updateTag(initialData.id, payload);
    } else {
      result = await createTag(payload as Pick<Tag, 'name' | 'parent_id' | 'type_id' | 'metadata'>);
    }

    if (result) {
      onSuccess();
    } else {
      setSubmitError(tagsError || "An unknown error occurred while saving the tag.");
    }
  }

  if (isLoadingTagTypes || (isLoadingTags && !tags.length && !isEditing) ) { // Show loader if critical data for form isn't ready
    return <div className="flex justify-center items-center p-4"><Loader2 className="h-6 w-6 animate-spin" /> Loading form data...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tag Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., React, Beginner, Priority" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tag Type (Optional)</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value || NONE_VALUE_ID}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NONE_VALUE_ID}><em>None</em></SelectItem>
                  {tagTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="parent_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent Tag (Optional)</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value || NONE_VALUE_ID}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a parent tag (for hierarchy)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NONE_VALUE_ID}><em>None (Root Tag)</em></SelectItem>
                  {/* Filter out the current tag if editing to prevent self-parenting */}
                  {tags.filter(tag => !isEditing || tag.id !== initialData?.id).map(tag => (
                    <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Select a parent to create a hierarchy.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="metadata"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Metadata (Optional, JSON format)</FormLabel>
              <FormControl>
                <Textarea placeholder='e.g., { "color": "blue", "priority": 1 }' {...field} rows={3} />
              </FormControl>
              <FormDescription>Enter valid JSON or leave empty.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {submitError && <p className="text-sm font-medium text-destructive">{submitError}</p>}
        
        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoadingTags}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoadingTags || isLoadingTagTypes}>
            {(isLoadingTags || isLoadingTagTypes) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEditing ? "Save Changes" : "Create Tag"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
