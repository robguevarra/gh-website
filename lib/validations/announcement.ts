import { z } from 'zod';

export const announcementTypeSchema = z.enum(['live_class', 'sale_promo', 'general_update', 'new_content']);
export const announcementStatusSchema = z.enum(['draft', 'published', 'archived']);

export const announcementBaseSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters long.' }),
  content: z.string().min(10, { message: 'Content must be at least 10 characters long.' }),
  type: announcementTypeSchema,
  status: announcementStatusSchema.default('draft'), // Default for creation
  publish_date: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string()
      .refine((val) => val === undefined || !isNaN(new Date(val).getTime()), {
        message: "Invalid datetime string",
      })
      .transform((val) => val === undefined ? undefined : (val ? new Date(val).toISOString() : undefined))
      .nullable()
      .optional()
  ),
  expiry_date: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string()
      .refine((val) => val === undefined || !isNaN(new Date(val).getTime()), {
        message: "Invalid datetime string",
      })
      .transform((val) => val === undefined ? undefined : (val ? new Date(val).toISOString() : undefined))
      .nullable()
      .optional()
  ),
  link_url: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().url({ message: "Invalid URL format." }).nullable().optional()
  ),
  link_text: z.preprocess(
    (val) => (val === "" ? null : val), // Convert empty string to null for optional text fields
    z.string().nullable().optional()
  ),
  image_url: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().url({ message: "Invalid URL format." }).nullable().optional()
  ),
  host_name: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional()
  ),
  host_avatar_url: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().url({ message: "Invalid URL format." }).nullable().optional()
  ),
  target_audience: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional()
  ),
  sort_order: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().nullable().optional()
  ),
});

export const createAnnouncementSchema = announcementBaseSchema;

// For updates, status does not have a default and all fields are optional
export const updateAnnouncementSchema = announcementBaseSchema.omit({ status: true }).extend({
  status: announcementStatusSchema.optional(),
}).partial();

// Schema for query parameters when listing announcements (admin)
export const listAnnouncementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: announcementStatusSchema.optional(),
  type: announcementTypeSchema.optional(),
  sortBy: z.enum(['created_at', 'publish_date', 'title', 'status', 'type', 'sort_order']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Schema for public listing of announcements
export const publicListAnnouncementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  type: announcementTypeSchema.optional(),
  // Public usually sorts by publish_date descending by default
  sortBy: z.enum(['publish_date', 'created_at', 'sort_order']).default('publish_date'), 
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
