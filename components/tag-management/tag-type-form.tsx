// components/tag-management/tag-type-form.tsx
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTagStore } from "@/lib/hooks/use-tag-store";
import type { TagType } from "@/lib/supabase/data-access/tags";
import { useState } from "react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50),
  description: z.string().max(200).optional(),
});

type TagTypeFormValues = z.infer<typeof formSchema>;

interface TagTypeFormProps {
  initialData?: Partial<TagType>;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TagTypeForm({ initialData, onSuccess, onCancel }: TagTypeFormProps) {
  const {
    createTagType,
    updateTagType,
    isLoadingTagTypes,
    tagTypesError,
  } = useTagStore();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditing = !!initialData?.id;

  const form = useForm<TagTypeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
    },
  });

  async function onSubmit(values: TagTypeFormValues) {
    setSubmitError(null);
    let result;
    if (isEditing && initialData?.id) {
      result = await updateTagType(initialData.id, values);
    } else {
      result = await createTagType(values);
    }

    if (result) {
      onSuccess();
    } else {
      setSubmitError(tagTypesError || "An unknown error occurred.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Behavioral, Industry" {...field} />
              </FormControl>
              <FormDescription>A unique name for the tag type.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe what this tag type is for" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {submitError && <p className="text-sm font-medium text-destructive">{submitError}</p>}
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoadingTagTypes}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoadingTagTypes}>
            {isLoadingTagTypes ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Create Type")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
