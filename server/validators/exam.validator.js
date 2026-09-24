import { z } from "zod";

export const generateExamSchema = z
  .object({
    documentIds: z
      .array(z.string().min(1, "Document ID cannot be empty"))
      .min(1, "At least one document ID is required."),

    totalQuestions: z.coerce
      .number()
      .int()
      .min(1, "Total questions must be at least 1.")
      .max(100, "Maximum allowed questions per exam is 100."),

    mcqCount: z.coerce.number().int().min(0).default(0),

    shortCount: z.coerce.number().int().min(0).default(0),

    longCount: z.coerce.number().int().min(0).default(0),

    difficulty: z
      .string()
      .transform((val) => val.toLowerCase())
      .pipe(z.enum(["easy", "medium", "hard", "mixed"]))
      .default("medium"),

    focusTopics: z
      .string()
      .max(1000, "Focus topics text must not exceed 1000 characters.")
      .optional()
      .default(""),

    includeAnswers: z.boolean().optional().default(true),
  })
  .refine(
    (data) => data.mcqCount + data.shortCount + data.longCount === data.totalQuestions,
    {
      message: "The sum of MCQ, Short, and Long questions must equal totalQuestions.",
      path: ["totalQuestions"],
    }
  );

export const discussQuestionSchema = z.object({
  question: z.string().trim().min(1, "Question cannot be empty."),
  answer: z.string().optional().default(""),
  explanation: z.string().optional().default(""),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1, "Message content cannot be empty."),
      })
    )
    .min(1, "At least one discussion message is required."),
});

export const summarizeDocumentSchema = z.object({
  documentId: z.string().trim().min(1, "Document ID is required."),
});
