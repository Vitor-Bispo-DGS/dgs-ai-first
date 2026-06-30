import OpenAI from "openai";
import { config } from "../shared/config.js";
import { withRetry } from "../shared/retry.js";
import { CompletionError, EmbeddingError } from "../shared/errors.js";
import type { RequestLogger } from "../shared/logger.js";

function createOpenAIClient(deployment: string): OpenAI {
  return new OpenAI({
    apiKey: config.azureOpenAI.apiKey,
    baseURL: `${config.azureOpenAI.endpoint}openai/deployments/${deployment}`,
    defaultQuery: { "api-version": "2024-02-01" },
    defaultHeaders: { "api-key": config.azureOpenAI.apiKey },
  });
}

export async function getEmbedding(
  question: string,
  logger: RequestLogger
): Promise<number[]> {
  const start = Date.now();
  logger.info({ stage: "embedding_start" }, "Generating embedding");

  try {
    const result = await withRetry(async () => {
      const client = createOpenAIClient(config.azureOpenAI.embeddingDeployment);
      const response = await client.embeddings.create({
        model: config.azureOpenAI.embeddingDeployment,
        input: question,
      });
      return response.data[0].embedding;
    });

    logger.info({ stage: "embedding_done", durationMs: Date.now() - start }, "Embedding generated");
    return result;
  } catch (error) {
    logger.error({ stage: "embedding_error", err: error, durationMs: Date.now() - start }, "Embedding failed");
    throw new EmbeddingError("Failed to generate embedding", error);
  }
}

export async function getChatCompletion(
  systemPrompt: string,
  userMessage: string,
  logger: RequestLogger
): Promise<string> {
  const start = Date.now();
  logger.info({ stage: "completion_start" }, "Calling GPT-4o");

  const timeoutMs = config.chatTimeoutMs;

  try {
    const result = await withRetry(async () => {
      const client = createOpenAIClient(config.azureOpenAI.chatDeployment);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await client.chat.completions.create(
          {
            model: config.azureOpenAI.chatDeployment,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
          },
          { signal: controller.signal }
        );
        return response.choices[0]?.message?.content ?? "";
      } finally {
        clearTimeout(timeout);
      }
    });

    logger.info({ stage: "completion_done", durationMs: Date.now() - start }, "GPT-4o responded");
    return result;
  } catch (error) {
    logger.error({ stage: "completion_error", err: error, durationMs: Date.now() - start }, "Completion failed");
    throw new CompletionError("Failed to get chat completion", error);
  }
}
