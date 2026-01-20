'use client';

import { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useSegmentStore, Segment } from '@/lib/hooks/use-segment-store';
import { OperatorType, SegmentRules, TagCondition } from '@/lib/segmentation/engine';
import { useTagStore } from '@/lib/hooks/use-tag-store';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Tag, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

// Define the form schema
const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  // Rules are handled separately in component state
});

type FormValues = z.infer<typeof formSchema>;

interface SegmentFormProps {
  segment?: Segment;
  onSuccess?: (segment: Segment) => void;
  onCancel?: () => void;
}

export function SegmentForm({ segment, onSuccess, onCancel }: SegmentFormProps) {
  const { createSegment, updateSegment } = useSegmentStore();
  const { tags, fetchTags } = useTagStore();
  const { toast } = useToast();

  // State for segment rules
  const [operator, setOperator] = useState<OperatorType>(segment?.rules?.operator || 'AND');
  const [selectedTags, setSelectedTags] = useState<TagCondition[]>(
    segment?.rules?.conditions?.filter(c => c.type === 'tag') as TagCondition[] || []
  );

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: segment?.name || '',
      description: segment?.description || '',
    },
  });

  // Fetch tags on mount
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Reset form when segment prop changes
  useEffect(() => {
    if (segment) {
      form.reset({
        name: segment.name,
        description: segment.description || '',
      });
      setOperator(segment.rules?.operator || 'AND');
      setSelectedTags(
        segment.rules?.conditions?.filter(c => c.type === 'tag') as TagCondition[] || []
      );
    } else {
      // Reset to empty if switching to create mode
      form.reset({
        name: '',
        description: '',
      });
      setOperator('AND');
      setSelectedTags([]);
    }
  }, [segment, form]);

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    // Construct the segment rules
    const rules: SegmentRules = {
      operator,
      conditions: selectedTags,
    };

    try {
      let result;

      if (segment) {
        // Update existing segment
        result = await updateSegment(segment.id, {
          ...values,
          rules,
        });
      } else {
        // Create new segment
        result = await createSegment({
          ...values,
          rules,
        });
      }

      if (result) {
        toast({
          title: segment ? 'Segment updated' : 'Segment created',
          description: `Successfully ${segment ? 'updated' : 'created'} segment "${values.name}"`,
        });

        if (onSuccess) {
          onSuccess(result);
        }
      } else {
        toast({
          title: 'Error',
          description: `Failed to ${segment ? 'update' : 'create'} segment`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error submitting segment form:', error);
      toast({
        title: 'Error',
        description: `Failed to ${segment ? 'update' : 'create'} segment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  // Handle adding a tag to the segment
  const addTag = (tagId: string) => {
    // Check if tag is already selected
    if (selectedTags.some(tag => tag.tagId === tagId)) {
      return;
    }

    // Add the tag
    setSelectedTags([...selectedTags, { type: 'tag', tagId }]);
  };

  // Handle removing a tag from the segment
  const removeTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter(tag => tag.tagId !== tagId));
  };

  // Find tag by ID
  const getTagById = (tagId: string) => {
    return tags.find(tag => tag.id === tagId);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{segment ? 'Edit Segment' : 'Create Segment'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter segment name" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this segment
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter segment description (optional)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional details about this segment
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel>Segment Rules</FormLabel>

              <div className="flex items-center space-x-2 mb-4">
                <span>Match users with</span>
                <Select
                  value={operator}
                  onValueChange={(value) => setOperator(value as OperatorType)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">ALL</SelectItem>
                    <SelectItem value="OR">ANY</SelectItem>
                  </SelectContent>
                </Select>
                <span>of the following tags:</span>
              </div>

              <div className="border rounded-md p-4">
                <Tabs defaultValue="selected">
                  <TabsList className="mb-4">
                    <TabsTrigger value="selected">
                      Selected Tags ({selectedTags.length})
                    </TabsTrigger>
                    <TabsTrigger value="available">
                      Available Tags ({tags.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="selected">
                    {selectedTags.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No tags selected. Add tags from the "Available Tags" tab.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedTags.map((tagCondition) => {
                          const tag = getTagById(tagCondition.tagId);
                          return (
                            <Badge key={tagCondition.tagId} className="flex items-center gap-1 px-3 py-1">
                              <Tag size={14} />
                              <span>{tag?.name || 'Unknown Tag'}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 ml-1"
                                onClick={() => removeTag(tagCondition.tagId)}
                              >
                                <X size={12} />
                              </Button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="available">
                    {tags.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No tags available. Create tags in the Tag Management section.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => {
                          const isSelected = selectedTags.some(t => t.tagId === tag.id);
                          return (
                            <Badge
                              key={tag.id}
                              variant={isSelected ? "secondary" : "outline"}
                              className="flex items-center gap-1 px-3 py-1 cursor-pointer"
                              onClick={() => isSelected ? removeTag(tag.id) : addTag(tag.id)}
                            >
                              <Tag size={14} />
                              <span>{tag.name}</span>
                              {tag.user_count !== undefined && (
                                <span className="flex items-center text-xs ml-1">
                                  <Users size={12} className="mr-1" />
                                  {tag.user_count}
                                </span>
                              )}
                              {isSelected ? (
                                <X size={12} className="ml-1" />
                              ) : (
                                <Plus size={12} className="ml-1" />
                              )}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {selectedTags.length === 0 && (
                <p className="text-sm text-destructive">
                  Please select at least one tag for this segment.
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={selectedTags.length === 0 || form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Saving...' : segment ? 'Update Segment' : 'Create Segment'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
