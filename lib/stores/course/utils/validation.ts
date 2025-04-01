import { toast } from '@/components/ui/use-toast';
import { z } from 'zod';
import type { Course, ExtendedModule, Lesson } from '../types';
import { courseUpdateSchema, moduleUpdateSchema, lessonUpdateSchema } from '../schemas';

export async function validateCourseUpdate(data: Partial<Course>): Promise<Partial<Course>> {
  try {
    return courseUpdateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = 'Invalid course data: ' + error.errors.map(e => e.message).join(', ');
      toast({
        title: 'Validation Error',
        description: message,
        variant: 'destructive',
      });
      throw new Error(message);
    }
    throw error;
  }
}

export async function validateModuleUpdate(data: Partial<ExtendedModule>): Promise<Partial<ExtendedModule>> {
  try {
    return moduleUpdateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = 'Invalid module data: ' + error.errors.map(e => e.message).join(', ');
      toast({
        title: 'Validation Error',
        description: message,
        variant: 'destructive',
      });
      throw new Error(message);
    }
    throw error;
  }
}

export async function validateLessonUpdate(data: Partial<Lesson>): Promise<Partial<Lesson>> {
  try {
    return lessonUpdateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = 'Invalid lesson data: ' + error.errors.map(e => e.message).join(', ');
      toast({
        title: 'Validation Error',
        description: message,
        variant: 'destructive',
      });
      throw new Error(message);
    }
    throw error;
  }
} 