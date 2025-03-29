import { useEffect, useState, useCallback } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCourseStore, type Course, type Module, type Lesson } from '@/lib/stores/course-store';
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
  is_published: z.boolean().default(false),
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
  content_json: z.record(z.unknown()).optional(),
  position: z.number(),
  status: z.enum(['draft', 'published', 'archived']),
});

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type ContentEditorProps = {
  editingItem: EditingItem | null;
  moduleTreeRef: React.RefObject<ModuleTreeHandle>;
};

export function ContentEditor({ editingItem, moduleTreeRef }: ContentEditorProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const course = useCourseStore((state: { course: Course | null }) => state.course);
  const updateCourse = useCourseStore((state: { updateCourse: (courseId: string, data: Partial<Course>) => Promise<void> }) => state.updateCourse);
  const updateModule = useCourseStore((state: { updateModule: (moduleId: string, data: Partial<Module>) => Promise<void> }) => state.updateModule);
  const updateLesson = useCourseStore((state: { updateLesson: (lessonId: string, data: Partial<Lesson>) => Promise<void> }) => state.updateLesson);

  const courseForm = useForm<z.infer<typeof courseFormSchema>>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: '',
      description: '',
      is_published: false,
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

  useEffect(() => {
    if (!course || !editingItem) return;

    if (editingItem.type === 'course') {
      courseForm.reset({
        title: course.title,
        description: course.description,
        is_published: course.is_published,
      });
    } else if (editingItem.type === 'module') {
      const module = course.modules?.find((m: Module) => m.id === editingItem.id);
      if (module) {
        moduleForm.reset({
          title: module.title,
          description: module.description,
          position: module.position,
          status: module.status || 'draft',
        });
      }
    } else if (editingItem.type === 'lesson') {
      const module = course.modules?.find((m: Module) => m.id === editingItem.moduleId);
      const lesson = module?.lessons?.find((l: Lesson) => l.id === editingItem.id);
      if (lesson) {
        lessonForm.reset({
          title: lesson.title,
          description: lesson.description,
          content_json: lesson.content_json || {},
          position: lesson.position,
          status: lesson.status || 'draft',
        });
      }
    }
  }, [course, editingItem, courseForm, moduleForm, lessonForm]);

  const handleSave = useCallback(async (data: any) => {
    setSaveStatus('saving');
    setErrorMessage(null);
    try {
      if (!editingItem || !course) return;

      switch (editingItem.type) {
        case 'course':
          await updateCourse(course.id, data);
          break;
        case 'module':
          await updateModule(editingItem.id, data);
          break;
        case 'lesson':
          await updateLesson(editingItem.id, data);
          break;
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setErrorMessage((error as Error).message);
    }
  }, [editingItem, course, updateCourse, updateModule, updateLesson]);

  // Debounce the form values for autosave
  const debouncedCourseValues = useDebounce(courseForm.watch(), 1000);
  const debouncedModuleValues = useDebounce(moduleForm.watch(), 1000);
  const debouncedLessonValues = useDebounce(lessonForm.watch(), 1000);

  // Autosave effect
  useEffect(() => {
    if (!editingItem || !course) return;

    if (editingItem.type === 'course' && courseForm.formState.isDirty) {
      handleSave(debouncedCourseValues);
    } else if (editingItem.type === 'module' && moduleForm.formState.isDirty) {
      handleSave(debouncedModuleValues);
    } else if (editingItem.type === 'lesson' && lessonForm.formState.isDirty) {
      handleSave(debouncedLessonValues);
    }
  }, [debouncedCourseValues, debouncedModuleValues, debouncedLessonValues, editingItem, course, handleSave]);

  if (!course || !editingItem) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select an item to edit
      </div>
    );
  }

  const renderSaveStatus = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <div className="flex items-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Saving...
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center text-green-600">
            <Check className="h-4 w-4 mr-2" />
            Saved
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center text-destructive">
            {errorMessage || 'Error saving changes'}
          </div>
        );
      default:
        return null;
    }
  };

  const renderForm = () => {
    switch (editingItem.type) {
      case 'course':
        return (
          <Form {...courseForm}>
            <form className="space-y-4">
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
                name="is_published"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Published</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value ? 'true' : 'false'}
                        onValueChange={(value) => field.onChange(value === 'true')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">Draft</SelectItem>
                          <SelectItem value="true">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Save Changes</Button>
            </form>
          </Form>
        );

      case 'module':
        return (
          <Form {...moduleForm}>
            <form className="space-y-4">
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
        );

      case 'lesson':
        return (
          <Form {...lessonForm}>
            <form className="space-y-4">
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
        );

      default:
        return null;
    }
  };

  return <div className="p-4">{renderForm()}</div>;
} 