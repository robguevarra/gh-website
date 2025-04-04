import { Lesson } from './lesson';

/**
 * Base module type from the API
 *
 * @property {string} id - Unique identifier for the module
 * @property {string} title - Module title
 * @property {string} [description] - Optional module description
 * @property {number} position - Module position in the course
 * @property {Lesson[]} [lessons] - Array of lessons in this module
 * @property {Record<string, unknown>} [metadata] - Additional module metadata
 * @property {string} [updated_at] - Last update timestamp
 */
export interface Module {
  id: string;
  title: string;
  description?: string;
  position: number;
  lessons?: Lesson[];
  metadata?: Record<string, unknown>;
  updated_at?: string;
}

/**
 * Extended module type used in the UI with guaranteed lessons array
 * This is the primary module type used throughout the application
 */
export interface ExtendedModule extends Module {
  lessons: Lesson[]; // Required in UI
}