// Lightweight schema for validation
import { z } from "zod";

export const AskRequestSchema = z.object({
  reportId: z.string(),
  question: z.string().min(3),
});

export const AskResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(z.string()).optional(),
});

export const UploadResponseSchema = z.object({
  jobId: z.string(),
});
