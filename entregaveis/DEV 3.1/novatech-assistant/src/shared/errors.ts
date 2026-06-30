export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class EmbeddingError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, "EMBEDDING_ERROR", cause);
    this.name = "EmbeddingError";
  }
}

export class SearchError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, "SEARCH_ERROR", cause);
    this.name = "SearchError";
  }
}

export class CompletionError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, "COMPLETION_ERROR", cause);
    this.name = "CompletionError";
  }
}

export class SystemPromptError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, "SYSTEM_PROMPT_ERROR", cause);
    this.name = "SystemPromptError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, "VALIDATION_ERROR", cause);
    this.name = "ValidationError";
  }
}
