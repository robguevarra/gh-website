import { Lesson } from './lesson';
import { ModuleItem } from './store';

export interface Module {
  id: string;
  title: string;
  description?: string;
  position: number;
  lessons?: Lesson[];
  items?: ModuleItem[];
  metadata?: Record<string, unknown>;
  updated_at?: string;
}

export interface ExtendedModule extends Module {
  items: ModuleItem[];
  lessons: Lesson[];
} 