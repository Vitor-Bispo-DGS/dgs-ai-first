import type { Chunk } from "../../shared/types.js";
import { buildAssistantResponse } from "../../services/response-validator.js";

export function buildResponse(answer: string, chunks: Chunk[]) {
  return buildAssistantResponse(answer, chunks);
}
