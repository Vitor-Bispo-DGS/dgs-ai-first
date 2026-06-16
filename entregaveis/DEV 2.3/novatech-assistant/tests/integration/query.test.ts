import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockChunks } from "../fixtures/chunks.js";

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

  it("returns 200 with answer and source_documents for a valid question", async () => {
    const request = makeRequest({ question: "Qual é o prazo de devolução?" });
    const context = makeContext();

    const response = await queryHandler(request, context);

    expect(response.status).toBe(200);
    const body = response.jsonBody as { answer: string; source_documents: string[] };
    expect(body.answer).toBeTruthy();
    expect(Array.isArray(body.source_documents)).toBe(true);
    expect(body.source_documents.length).toBeGreaterThan(0);
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
});
