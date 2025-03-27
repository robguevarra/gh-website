"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const lessonFormSchema = z.object({
  title: z.string().min(3, {
    message: "Title must be at least 3 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  position: z.number().int().min(0),
  status: z.enum(["draft", "published", "archived"], {
    required_error: "Please select a status.",
  }),
});

type LessonFormValues = z.infer<typeof lessonFormSchema>;

interface NewLessonPageProps {
  params: {
    courseId: string;
    moduleId: string;
  };
}

export default function NewLessonPage({ params }: NewLessonPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { courseId, moduleId } = params;

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      title: "",
      description: "",
      position: 0,
      status: "draft",
    },
  });

  const onSubmit = async (data: LessonFormValues) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          module_id: moduleId,
          content: "", // Empty content to be filled with rich text editor
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create lesson");
      }
      
      const lesson = await response.json();
      
      toast({
        title: "Lesson created",
        description: "Your new lesson has been created successfully.",
      });
      
      // Redirect to the unified editor for the course with the new lesson selected
      router.push(`/admin/courses/${courseId}/unified?module=${moduleId}&lesson=${lesson.id}`);
    } catch (error) {
      console.error("Error creating lesson:", error);
      toast({
        title: "Error",
        description: "Failed to create lesson. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Create New Lesson</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Lesson Details</CardTitle>
          <CardDescription>
            Add a new lesson to your module. After creating, you'll be able to add content using the rich text editor.
          </CardDescription>
        </CardHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Getting Started with the Basics" 
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The name of your lesson as it will appear to students.
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
                        placeholder="Brief overview of this lesson's content..." 
                        className="min-h-32"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A short description that explains what this lesson covers.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          step="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          value={field.value}
                        />
                      </FormControl>
                      <FormDescription>
                        The order in which this lesson appears in the module.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>
                        Determines if the lesson is visible to students.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/admin/courses/${courseId}/unified?module=${moduleId}`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Lesson"
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
} 