import { Lesson } from './lesson';

// Base module type from the API
export interface Module {
  id: string;
  title: string;
  description?: string;
  position: number;
  lessons?: Lesson[];
  metadata?: Record<string, unknown>;
  updated_at?: string;
}

// Extended module type used in the UI with guaranteed items array
export interface ExtendedModule extends Module {
  lessons: Lesson[]; // Required in UI
} 