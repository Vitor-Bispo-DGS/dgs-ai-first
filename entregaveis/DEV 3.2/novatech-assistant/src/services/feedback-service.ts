import { randomUUID } from "crypto";
import { CosmosClient } from "@azure/cosmos";
import { config } from "../shared/config.js";
import { FeedbackError } from "../shared/errors.js";
import type { RequestLogger } from "../shared/logger.js";
import type { FeedbackRequest, FeedbackRecord } from "../shared/types.js";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

/**
 * Exponential backoff delay calculator.
 * delay = INITIAL_BACKOFF_MS * (2 ^ attempt) + jitter
 */
function calculateBackoff(attempt: number): number {
  const baseDelay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelay * 0.1;
  return baseDelay + jitter;
}

function extractStatusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const candidate = error as { code?: unknown; statusCode?: unknown };
  if (typeof candidate.code === "number") {
    return candidate.code;
  }
  if (typeof candidate.statusCode === "number") {
    return candidate.statusCode;
  }

  return undefined;
}

export class FeedbackService {
  private client: CosmosClient;
  private databaseName: string;
  private containerName: string;

  constructor(client: CosmosClient) {
    this.client = client;
    this.databaseName = config.cosmos.databaseName;
    this.containerName = config.cosmos.containerName;
  }

  /**
   * Saves feedback to Cosmos DB with exponential backoff retry logic.
   * Does NOT log the attendant email or comment to protect PII.
   */
  async saveFeedback(
    feedback: FeedbackRequest,
    correlationId: string,
    logger: RequestLogger
  ): Promise<string> {
    const feedbackRecord: FeedbackRecord = {
      id: randomUUID(),
      ...feedback,
      timestamp: new Date().toISOString(),
    };

    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const database = this.client.database(this.databaseName);
        const container = database.container(this.containerName);

        logger.debug(
          {
            correlationId,
            attempt: attempt + 1,
            feedbackId: feedbackRecord.id,
            queryId: feedbackRecord.queryId,
            stage: "cosmos_write_attempt",
          },
          "Attempting to save feedback to Cosmos DB"
        );

        const response = await container.items.create(feedbackRecord);

        logger.info(
          {
            correlationId,
            feedbackId: feedbackRecord.id,
            queryId: feedbackRecord.queryId,
            stage: "feedback_saved_success",
          },
          "Feedback saved successfully"
        );

        return feedbackRecord.id;
      } catch (error) {
        lastError = error;

        const statusCode = extractStatusCode(error) ?? 500;
        const isRetryable = statusCode === 429 || statusCode === 503 || statusCode >= 500;

        logger.warn(
          {
            correlationId,
            attempt: attempt + 1,
            statusCode,
            isRetryable,
            stage: "cosmos_write_error",
          },
          `Cosmos write attempt ${attempt + 1} failed`
        );

        if (!isRetryable || attempt === MAX_RETRIES - 1) {
          break;
        }

        const delayMs = calculateBackoff(attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    logger.error(
      {
        correlationId,
        stage: "feedback_save_failed",
        err: lastError,
      },
      `Failed to save feedback after ${MAX_RETRIES} attempts`
    );

    throw new FeedbackError("Failed to save feedback to database", lastError);
  }
}

let cachedClient: CosmosClient | null = null;

/**
 * Get or create a singleton Cosmos DB client.
 * Reuses the connection across function invocations within the same warm start.
 */
export function getCosmosClient(): CosmosClient {
  if (!cachedClient) {
    if (!config.cosmos.connectionString) {
      throw new FeedbackError("COSMOS_CONNECTION_STRING environment variable is required");
    }
    cachedClient = new CosmosClient(config.cosmos.connectionString);
  }
  return cachedClient;
}

/**
 * Factory function to create a FeedbackService instance.
 * Provides dependency injection for testability.
 */
export function createFeedbackService(client?: CosmosClient): FeedbackService {
  const cosmosClient = client ?? getCosmosClient();
  return new FeedbackService(cosmosClient);
}
