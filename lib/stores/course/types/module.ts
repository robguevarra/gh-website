import { Lesson } from './lesson';
import { ModuleItem } from './store';

export interface Module {
  id: string;
  title: string;
  description?: string;
  position: number;
  status: 'draft' | 'published' | 'archived';
  metadata?: Record<string, unknown>;
  updated_at?: string;
  lessons?: Lesson[];
}

export interface ExtendedModule extends Module {
  items?: ModuleItem[];
} 