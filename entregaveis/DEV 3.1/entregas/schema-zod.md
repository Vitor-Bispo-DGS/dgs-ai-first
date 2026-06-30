import { z } from "zod";

export const AssistantResponseSchema = z
  .object({
    answer: z
      .string()
      .trim()
      .min(1, "answer must not be empty"),
    source_document: z
      .array(z.string().trim().min(1, "source_document entries must not be empty"))
      .min(1, "source_document must contain at least one source"),
    confidence_score: z
      .number()
      .finite("confidence_score must be between 0 and 1")
      .min(0, "confidence_score must be between 0 and 1")
      .max(1, "confidence_score must be between 0 and 1"),
  })
  .superRefine((response, ctx) => {
    // Guardrail 2: Bloqueia afirmações de devolução de carga perigosa
    if (shouldBlockDangerousCargoReturn(response.answer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answer"],
        message: "dangerous cargo return answers cannot state that return is possible",
      });
    }
  });