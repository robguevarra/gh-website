import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCourseStore } from '@/lib/stores/course-store';
import type { Course, Module, Lesson } from '@/types/course';
import { Button } from '@/components/ui/button';
import { Loader2, Check } from 'lucide-react';
import {
  Form,
  FormControl,
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
import { TipTapEditor } from './TipTapEditor';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { ModuleTreeHandle } from '@/components/admin/courses/course-editor/module-tree-v2';

export type EditingItem = {
  type: 'course' | 'module' | 'lesson';
  id: string;
  moduleId?: string;
};

const courseFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']),
});

const moduleFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  position: z.number(),
  status: z.enum(['draft', 'published', 'archived']),
});

const lessonFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  content_json: z.any(),
  position: z.number(),
  status: z.enum(['draft', 'published', 'archived']),
});

interface ContentEditorProps {
  editingItem: EditingItem;
  moduleTreeRef?: React.RefObject<any>;
}

export function ContentEditor({ editingItem, moduleTreeRef }: ContentEditorProps) {
  const course = useCourseStore((state) => state.course);
  const updateCourse = useCourseStore((state) => state.updateCourse);
  const updateModule = useCourseStore((state) => state.updateModule);
  const updateLesson = useCourseStore((state) => state.updateLesson);
  const pendingSave = useCourseStore((state) => state.pendingSave);
  const lastSaveTime = useCourseStore((state) => state.lastSaveTime);
  const error = useCourseStore((state) => state.error);

  const courseForm = useForm<z.infer<typeof courseFormSchema>>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'draft',
    },
  });

  const moduleForm = useForm<z.infer<typeof moduleFormSchema>>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      title: '',
      description: '',
      position: 0,
      status: 'draft',
    },
  });

  const lessonForm = useForm<z.infer<typeof lessonFormSchema>>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      title: '',
      description: '',
      content_json: {},
      position: 0,
      status: 'draft',
    },
  });

  // Reset form when editing item changes
  useEffect(() => {
    if (!course || !editingItem) return;

    if (editingItem.type === 'course') {
      courseForm.reset({
        title: course.title,
        description: course.description || '',
        status: course.status,
      });
    } else if (editingItem.type === 'module') {
      const module = course.modules?.find((m) => m.id === editingItem.id);
      if (module) {
        moduleForm.reset({
          title: module.title,
          description: module.description || '',
          position: module.position,
          status: module.status,
        });
      }
    } else if (editingItem.type === 'lesson') {
      const module = course.modules?.find((m) => m.id === editingItem.moduleId);
      const lesson = module?.lessons?.find((l) => l.id === editingItem.id);
      if (lesson) {
        lessonForm.reset({
          title: lesson.title,
          description: lesson.description || '',
          content_json: lesson.content_json || {},
          position: lesson.position,
          status: lesson.status,
        });
      }
    }
  }, [course, editingItem, courseForm, moduleForm, lessonForm]);

  // Watch form values for autosave
  const debouncedCourseValues = useDebounce(courseForm.watch(), 1000);
  const debouncedModuleValues = useDebounce(moduleForm.watch(), 1000);
  const debouncedLessonValues = useDebounce(lessonForm.watch(), 1000);

  // Remove all autosave related effects
  // Add logging for form state changes
  useEffect(() => {
    console.log('🔍 [Form State]', {
      timestamp: new Date().toISOString(),
      courseFormDirty: courseForm.formState.isDirty,
      moduleFormDirty: moduleForm.formState.isDirty,
      lessonFormDirty: lessonForm.formState.isDirty,
      editingItemType: editingItem?.type,
      editingItemId: editingItem?.id
    });
  }, [
    courseForm.formState.isDirty,
    moduleForm.formState.isDirty,
    lessonForm.formState.isDirty,
    editingItem
  ]);

  // Handle form submissions
  const onCourseSubmit = async (data: z.infer<typeof courseFormSchema>) => {
    if (!course) return;
    try {
      await updateCourse(course.id, data);
      courseForm.reset(data);
    } catch (error) {
      console.error('Failed to save course:', error);
    }
  };

  const onModuleSubmit = async (data: z.infer<typeof moduleFormSchema>) => {
    if (!editingItem.id) return;
    try {
      await updateModule(editingItem.id, data);
      moduleForm.reset(data);
    } catch (error) {
      console.error('Failed to save module:', error);
    }
  };

  const onLessonSubmit = async (data: z.infer<typeof lessonFormSchema>) => {
    if (!editingItem.id) return;
    try {
      await updateLesson(editingItem.id, data);
      lessonForm.reset(data);
    } catch (error) {
      console.error('Failed to save lesson:', error);
    }
  };

  if (!course || !editingItem) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select an item to edit
      </div>
    );
  }

  const renderSaveStatus = () => {
    if (error) {
      return (
        <div className="flex items-center text-destructive">
          {error}
        </div>
      );
    }

    if (pendingSave) {
      return (
        <div className="flex items-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Saving...
        </div>
      );
    }

    if (lastSaveTime) {
      return (
        <div className="flex items-center text-green-600">
          <Check className="h-4 w-4 mr-2" />
          Last saved at {new Date(lastSaveTime).toLocaleTimeString()}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-4">
      {editingItem.type === 'course' && (
        <Form {...courseForm}>
          <form onSubmit={courseForm.handleSubmit(onCourseSubmit)} className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Course Details</h2>
              {renderSaveStatus()}
            </div>
            <FormField
              control={courseForm.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={courseForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={courseForm.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Save Changes</Button>
          </form>
        </Form>
      )}

      {editingItem.type === 'module' && (
        <Form {...moduleForm}>
          <form onSubmit={moduleForm.handleSubmit(onModuleSubmit)} className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Module Details</h2>
              {renderSaveStatus()}
            </div>
            <FormField
              control={moduleForm.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={moduleForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={moduleForm.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={moduleForm.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Save Changes</Button>
          </form>
        </Form>
      )}

      {editingItem.type === 'lesson' && (
        <Form {...lessonForm}>
          <form onSubmit={lessonForm.handleSubmit(onLessonSubmit)} className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Lesson Details</h2>
              {renderSaveStatus()}
            </div>
            <FormField
              control={lessonForm.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={lessonForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={lessonForm.control}
              name="content_json"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <TipTapEditor
                      content={field.value ? JSON.stringify(field.value) : ''}
                      onChange={(content) => {
                        try {
                          const json = JSON.parse(content);
                          field.onChange(json);
                        } catch (error) {
                          console.error('Failed to parse JSON:', error);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={lessonForm.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={lessonForm.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Save Changes</Button>
          </form>
        </Form>
      )}
    </div>
  );
} 