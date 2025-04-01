import { z } from 'zod';

export const courseUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  is_published: z.boolean().optional(),
  content_json: z.record(z.unknown()).optional(),
  version: z.number().optional(),
  published_version: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  updated_at: z.string().datetime().optional()
}); 