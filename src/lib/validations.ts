import { z } from "zod";

export const PROJECT_CATEGORIES = [
  "custom_home",
  "residential_renovation",
  "commercial_new_build",
  "tenant_buildout",
  "design_build",
  "historic_restoration",
] as const;

export const leadSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Enter a valid email").max(255),
  phone: z
    .string()
    .max(50)
    .optional()
    .transform((v) => (v?.trim() ? v : undefined)),
  project_type: z.enum(PROJECT_CATEGORIES).optional(),
  message: z.string().min(10, "Please share a bit more detail").max(5000),
  // Honeypot — must be empty
  website: z.string().max(0).optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const bookingSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().min(7).max(50),
  project_type: z.enum(PROJECT_CATEGORIES).optional(),
  project_location: z.string().max(255).optional(),
  meeting_type: z.enum(["phone", "video", "in_person", "site_visit"]),
  preferred_date: z.string().min(1, "Pick a preferred date"),
  preferred_time_window: z.enum(["morning", "afternoon", "evening"]),
  notes: z.string().max(2000).optional(),
  website: z.string().max(0).optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const volunteerSignupSchema = z.object({
  event_id: z.string().uuid(),
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Enter a valid email").max(255),
  phone: z
    .string()
    .max(50)
    .optional()
    .transform((v) => (v?.trim() ? v : undefined)),
  group_size: z.coerce.number().int().min(1).max(10).default(1),
  experience_level: z.enum(["first_time", "some", "experienced"]).optional(),
  notes: z.string().max(2000).optional(),
  // Honeypot — checked before validation in the route
  website: z.string().optional(),
});

export type VolunteerSignupInput = z.infer<typeof volunteerSignupSchema>;

export const projectSchema = z.object({
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  title: z.string().min(2).max(200),
  subtitle: z.string().max(300).optional(),
  category: z.enum(PROJECT_CATEGORIES),
  status: z.enum(["draft", "pre_construction", "in_progress", "completed", "on_hold", "archived"]),
  excerpt: z.string().max(280).optional(),
  narrative: z.string().max(20000).optional(),
  hero_image_url: z.string().url().optional().or(z.literal("")),
  location: z.string().max(120).optional(),
  year_completed: z.number().int().min(1900).max(2100).optional(),
  square_footage: z.number().int().min(0).optional(),
  budget_range: z.string().max(60).optional(),
  meta_description: z.string().max(180).optional(),
  display_order: z.number().int().default(0),
  featured: z.boolean().default(false),
});

export type ProjectInput = z.infer<typeof projectSchema>;
