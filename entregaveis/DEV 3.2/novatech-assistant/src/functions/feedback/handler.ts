import { randomUUID } from "crypto";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { validateFeedbackRequest } from "./validator.js";
import { createFeedbackService } from "../../services/feedback-service.js";
import { createRequestLogger } from "../../shared/logger.js";
import { ValidationError, FeedbackError, AppError } from "../../shared/errors.js";

/**
 * Feedback handler — POST /api/feedback
 *
 * Receives feedback from attendants about assistant responses and stores it in Cosmos DB.
 * Implements proper validation, error handling, logging, and retry logic per AGENTS.md.
 */
export async function feedbackHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId = randomUUID();
  const logger = createRequestLogger(correlationId);
  const start = Date.now();

  logger.info(
    {
      method: request.method,
      url: request.url,
      invocationId: context.invocationId,
      stage: "request_received",
    },
    "Feedback request received"
  );

  try {
    // 1. Parse JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      logger.warn(
        { stage: "json_parse_error", err: error, durationMs: Date.now() - start },
        "Failed to parse request JSON"
      );
      return {
        status: 400,
        jsonBody: {
          success: false,
          message: "Invalid JSON in request body",
        },
      };
    }

    // 2. Validate input with Zod
    let validatedFeedback: ReturnType<typeof validateFeedbackRequest>;
    try {
      validatedFeedback = validateFeedbackRequest(body);
    } catch (error) {
      if (error instanceof ValidationError) {
        logger.warn(
          {
            stage: "validation_failed",
            reason: error.message,
            durationMs: Date.now() - start,
          },
          "Feedback validation failed"
        );
        return {
          status: 400,
          jsonBody: {
            success: false,
            message: error.message,
          },
        };
      }
      throw error;
    }

    // 3. Create service and save feedback
    const feedbackService = createFeedbackService();
    const feedbackId = await feedbackService.saveFeedback(
      validatedFeedback,
      correlationId,
      logger
    );

    logger.info(
      {
        stage: "feedback_handler_success",
        feedbackId,
        durationMs: Date.now() - start,
      },
      "Feedback processed successfully"
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: "Feedback saved successfully",
        feedbackId,
      },
    };
  } catch (error) {
    // 4. Unified error handling
    if (error instanceof FeedbackError) {
      logger.error(
        {
          stage: "feedback_service_error",
          code: error.code,
          reason: error.message,
          durationMs: Date.now() - start,
        },
        "Feedback service failed"
      );
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: "Failed to save feedback. Please try again later.",
        },
      };
    }

    if (error instanceof AppError) {
      logger.error(
        {
          stage: "app_error",
          code: error.code,
          reason: error.message,
          durationMs: Date.now() - start,
        },
        "Application error occurred"
      );
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: "An error occurred while processing your feedback.",
        },
      };
    }

    // Untyped error — log as critical but don't expose details
    logger.error(
      {
        stage: "unknown_error",
        err: error,
        durationMs: Date.now() - start,
      },
      "Unexpected error in feedback handler"
    );
    return {
      status: 500,
      jsonBody: {
        success: false,
        message: "An unexpected error occurred.",
      },
    };
  }
}

app.http("feedback", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "feedback",
  handler: feedbackHandler,
});