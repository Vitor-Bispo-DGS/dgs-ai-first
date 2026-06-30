import { z } from "zod";
import { AssistantResponseSchema } from "../../services/response-validator.js";

export const QueryRequestSchema = z.object({
  question: z.string().min(1, "question must not be empty").max(2000, "question too long"),
});

export const QueryResponseSchema = AssistantResponseSchema;

export type QueryRequestInput = z.infer<typeof QueryRequestSchema>;
export type QueryResponseOutput = z.infer<typeof QueryResponseSchema>;

export function validateQueryRequest(body: unknown): QueryRequestInput {
  return QueryRequestSchema.parse(body);
}

export function validateQueryResponse(data: unknown): QueryResponseOutput {
  return QueryResponseSchema.parse(data);
}
