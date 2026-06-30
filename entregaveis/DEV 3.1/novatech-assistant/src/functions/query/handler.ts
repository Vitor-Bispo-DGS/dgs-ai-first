import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { ZodError } from "zod";
import { validateQueryRequest } from "./validator.js";
import { buildResponse } from "./response-builder.js";
import { getEmbedding, getChatCompletion } from "../../services/completion.js";
import { getAssistantResponseRejectionDetails } from "../../services/response-validator.js";
import { searchChunks } from "../../services/search.js";
import { buildPrompt, getSystemPrompt, initSystemPrompt } from "../../services/prompt-builder.js";
import { createRequestLogger } from "../../shared/logger.js";
import { ValidationError } from "../../shared/errors.js";

let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (!initialized) {
    await initSystemPrompt();
    initialized = true;
  }
}

export async function queryHandler(
  request: HttpRequest,
  _context: InvocationContext
): Promise<HttpResponseInit> {
  const requestId = uuidv4();
  const logger = createRequestLogger(requestId);
  const start = Date.now();

  logger.info({ stage: "request_received", method: request.method, url: request.url }, "Request received");

  try {
    await ensureInitialized();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: "invalid_json" } };
    }

    let validatedBody: ReturnType<typeof validateQueryRequest>;
    try {
      validatedBody = validateQueryRequest(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          status: 400,
          jsonBody: { error: "validation_error", details: error.errors },
        };
      }
      throw error;
    }

    const { question } = validatedBody;

    const embedding = await getEmbedding(question, logger);
    const chunks = await searchChunks(embedding, logger);
    const systemPrompt = getSystemPrompt();
    const { system, user } = buildPrompt(systemPrompt, chunks, question);
    const answer = await getChatCompletion(system, user, logger);
    const response = buildResponse(answer, chunks);

    logger.info(
      { stage: "response_sent", durationMs: Date.now() - start },
      "Request completed successfully"
    );

    return { status: 200, jsonBody: response };
  } catch (error) {
    if (error instanceof ValidationError) {
      const rejectionDetails = getAssistantResponseRejectionDetails(error.cause);

      logger.warn(
        {
          stage: "assistant_response_invalid",
          err: error,
          rejectionDetails,
          durationMs: Date.now() - start,
        },
        "Assistant response rejected by validation"
      );
      return { status: 422, jsonBody: { error: error.message } };
    }

    logger.error(
      { stage: "request_error", err: error, durationMs: Date.now() - start },
      "Request failed"
    );
    return { status: 500, jsonBody: { error: "internal_error" } };
  }
}

app.http("query", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "query",
  handler: queryHandler,
});
