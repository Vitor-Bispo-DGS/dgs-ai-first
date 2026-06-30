import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockChunks } from "../fixtures/chunks.js";

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
  },
}));

vi.mock("../../src/services/completion.js", () => ({
  getEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
  getChatCompletion: vi.fn().mockResolvedValue("A NovaTech aceita devoluções em até 30 dias."),
}));

vi.mock("../../src/services/search.js", () => ({
  searchChunks: vi.fn().mockResolvedValue(mockChunks),
}));

vi.mock("../../src/services/prompt-builder.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/services/prompt-builder.js")>();
  return {
    ...original,
    initSystemPrompt: vi.fn().mockResolvedValue(undefined),
    getSystemPrompt: vi.fn().mockReturnValue("Você é o assistente NovaTech."),
  };
});

vi.mock("../../src/shared/logger.js", () => ({
  createRequestLogger: vi.fn().mockReturnValue(mockLogger),
}));

import { queryHandler } from "../../src/functions/query/handler.js";
import type { HttpRequest, InvocationContext } from "@azure/functions";

function makeRequest(body: unknown): HttpRequest {
  return {
    method: "POST",
    url: "http://localhost:7071/api/query",
    json: async () => body,
    headers: new Map(),
    params: {},
    query: new URLSearchParams(),
    user: null,
    get: () => null,
  } as unknown as HttpRequest;
}

function makeContext(): InvocationContext {
  return {
    invocationId: "test-invocation-id",
    functionName: "query",
    log: () => {},
    warn: () => {},
    error: () => {},
    trace: () => {},
    debug: () => {},
    info: () => {},
  } as unknown as InvocationContext;
}

describe("POST /api/query — integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with answer, source_document and confidence_score for a valid question", async () => {
    const request = makeRequest({ question: "Qual é o prazo de devolução?" });
    const context = makeContext();

    const response = await queryHandler(request, context);

    expect(response.status).toBe(200);
    const body = response.jsonBody as {
      answer: string;
      source_document: string[];
      confidence_score: number;
    };
    expect(body.answer).toBeTruthy();
    expect(Array.isArray(body.source_document)).toBe(true);
    expect(body.source_document.length).toBeGreaterThan(0);
    expect(body.confidence_score).toBeGreaterThanOrEqual(0);
    expect(body.confidence_score).toBeLessThanOrEqual(1);
  });

  it("returns 400 for missing question field", async () => {
    const request = makeRequest({});
    const context = makeContext();

    const response = await queryHandler(request, context);

    expect(response.status).toBe(400);
    const body = response.jsonBody as { error: string };
    expect(body.error).toBe("validation_error");
  });

  it("returns 400 for empty question", async () => {
    const request = makeRequest({ question: "" });
    const context = makeContext();

    const response = await queryHandler(request, context);

    expect(response.status).toBe(400);
    const body = response.jsonBody as { error: string };
    expect(body.error).toBe("validation_error");
  });

  it("returns 400 for invalid JSON", async () => {
    const request = {
      method: "POST",
      url: "http://localhost:7071/api/query",
      json: async () => { throw new SyntaxError("Invalid JSON"); },
      headers: new Map(),
      params: {},
      query: new URLSearchParams(),
      user: null,
      get: () => null,
    } as unknown as HttpRequest;

    const response = await queryHandler(request, makeContext());

    expect(response.status).toBe(400);
    const body = response.jsonBody as { error: string };
    expect(body.error).toBe("invalid_json");
  });

  it("returns 500 when Azure OpenAI fails", async () => {
    const { getEmbedding } = await import("../../src/services/completion.js");
    vi.mocked(getEmbedding).mockRejectedValueOnce(new Error("Azure OpenAI unavailable"));

    const request = makeRequest({ question: "Qual o SLA?" });
    const response = await queryHandler(request, makeContext());

    expect(response.status).toBe(500);
    const body = response.jsonBody as { error: string };
    expect(body.error).toBe("internal_error");
  });

  it("returns 422 with the standard message when source_document is missing", async () => {
    const { searchChunks } = await import("../../src/services/search.js");
    vi.mocked(searchChunks).mockResolvedValueOnce([]);

    const request = makeRequest({ question: "Qual é o prazo de devolução?" });
    const response = await queryHandler(request, makeContext());

    expect(response.status).toBe(422);
    const body = response.jsonBody as { error: string };
    expect(body.error).toBe(
      "Não consigo garantir uma resposta íntegra. Por favor, contate um superior ou tente novamente."
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "assistant_response_invalid",
        rejectionDetails: expect.arrayContaining([
          expect.objectContaining({
            path: "source_document",
            reason: "source_document must contain at least one source",
          }),
        ]),
      }),
      "Assistant response rejected by validation"
    );
  });

  it("returns 422 when the assistant says dangerous cargo can be returned", async () => {
    const { getChatCompletion } = await import("../../src/services/completion.js");
    vi.mocked(getChatCompletion).mockResolvedValueOnce(
      "A devolução de carga perigosa é possível com autorização prévia."
    );

    const request = makeRequest({ question: "Posso devolver carga perigosa?" });
    const response = await queryHandler(request, makeContext());

    expect(response.status).toBe(422);
    const body = response.jsonBody as { error: string };
    expect(body.error).toBe(
      "Não consigo garantir uma resposta íntegra. Por favor, contate um superior ou tente novamente."
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "assistant_response_invalid",
        rejectionDetails: expect.arrayContaining([
          expect.objectContaining({
            path: "answer",
            reason: "dangerous cargo return answers cannot state that return is possible",
          }),
        ]),
      }),
      "Assistant response rejected by validation"
    );
  });
});
