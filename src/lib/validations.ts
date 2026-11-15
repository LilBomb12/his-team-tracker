import { z } from "zod";

export const staffSchema = z.object({
  full_name: z.string().min(2),
  job_type: z.enum(["Doctor", "Specialist Doctor", "Head Nurse", "Nurse", "Administration"]),
  department_id: z.string().uuid().nullable().optional(),
  his_user_id: z.string().nullable().optional(),
});

export const interactionSchema = z.object({
  staff_member_id: z.string().uuid(),
  reporter_name: z.string().min(2),
  reporter_phone: z.string().min(5),
  outcome: z.enum(["registered","started_not_completed","busy","postponed","refused","not_available","avoided","technical_problem","needs_training","other"]),
  reason_category: z.enum(["clinical_workload","postponement","non_cooperation","technical","training","other"]).nullable().optional(),
  reason_detail: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  support_types: z.array(z.string()).default([]),
  had_laptop: z.boolean().default(false),
  had_internet: z.boolean().default(false),
  explanation_provided: z.boolean().default(false),
  explicit_refusal: z.boolean().default(false),
  followup_scheduled: z.boolean().default(false),
  followup_date: z.string().optional().nullable(),
});

export const followupSchema = z.object({
  staff_member_id: z.string().uuid(),
  assigned_to: z.string().uuid().nullable().optional(),
  due_date: z.string(),
  notes: z.string().optional().nullable(),
  priority: z.enum(["low","medium","high"]).default("medium"),
});

export const departmentSchema = z.object({
  name_ar: z.string().min(1),
  name_en: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
