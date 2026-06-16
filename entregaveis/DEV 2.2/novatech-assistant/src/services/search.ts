import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import { config } from "../shared/config.js";
import { withRetry } from "../shared/retry.js";
import { SearchError } from "../shared/errors.js";
import type { Chunk } from "../shared/types.js";
import type { RequestLogger } from "../shared/logger.js";

interface SearchDocument {
  id: string;
  content: string;
  source_document: string;
  vigencia?: string;
  embedding?: number[];
}

let searchClient: SearchClient<SearchDocument> | null = null;

function getSearchClient(): SearchClient<SearchDocument> {
  if (!searchClient) {
    searchClient = new SearchClient<SearchDocument>(
      config.azureSearch.endpoint,
      config.azureSearch.indexName,
      new AzureKeyCredential(config.azureSearch.apiKey)
    );
  }
  return searchClient;
}

export async function searchChunks(
  embedding: number[],
  logger: RequestLogger,
  topK = 5
): Promise<Chunk[]> {
  const start = Date.now();
  logger.info({ stage: "search_start" }, "Searching Azure AI Search");

  try {
    const chunks = await withRetry(async () => {
      const client = getSearchClient();
      const results = await client.search("*", {
        vectorSearchOptions: {
          queries: [
            {
              kind: "vector",
              vector: embedding,
              fields: ["embedding"],
              kNearestNeighborsCount: topK,
            },
          ],
        },
        select: ["id", "content", "source_document", "vigencia"],
        top: topK,
      });

      const chunks: Chunk[] = [];
      for await (const result of results.results) {
        const doc = result.document;
        chunks.push({
          id: doc.id,
          content: doc.content,
          source_document: doc.source_document,
          vigencia: doc.vigencia,
          score: result.score ?? undefined,
        });
      }
      return chunks;
    });

    logger.info(
      { stage: "search_done", chunkCount: chunks.length, durationMs: Date.now() - start },
      "Search completed"
    );
    return chunks;
  } catch (error) {
    logger.error({ stage: "search_error", err: error, durationMs: Date.now() - start }, "Search failed");
    throw new SearchError("Failed to search chunks", error);
  }
}
