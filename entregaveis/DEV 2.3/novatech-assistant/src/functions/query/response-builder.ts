import { z } from "zod";
import type { Chunk } from "../../shared/types.js";

const ResponseSchema = z.object({
  answer: z.string().min(1),
  source_documents: z.array(z.string()),
});

export function buildResponse(answer: string, chunks: Chunk[]) {
  const sourceDocuments = [...new Set(chunks.map((c) => c.source_document))];
  const response = { answer, source_documents: sourceDocuments };
  return ResponseSchema.parse(response);
}
