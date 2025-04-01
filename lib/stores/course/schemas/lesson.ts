import { z } from 'zod';

export const lessonUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  content_json: z.record(z.unknown()).optional(),
  position: z.number().int().min(0).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  version: z.number().int().min(1).optional(),
  metadata: z.record(z.unknown()).optional()
}); 