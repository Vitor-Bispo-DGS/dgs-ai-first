import { z } from "zod";
import { ValidationError } from "../../shared/errors.js";
import type { FeedbackRequest } from "../../shared/types.js";

const FEEDBACK_REQUEST_SCHEMA = z.object({
  queryId: z.string().uuid("queryId must be a valid UUID"),
  rating: z.number().int().min(1).max(5, "rating must be between 1 and 5"),
  comment: z.string().max(2000, "comment must not exceed 2000 characters"),
  attendantEmail: z.string().email("attendantEmail must be a valid email"),
});

export function validateFeedbackRequest(data: unknown): FeedbackRequest {
  try {
    return FEEDBACK_REQUEST_SCHEMA.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
      throw new ValidationError(`Feedback validation failed: ${issues}`, error);
    }
    throw error;
  }
}
