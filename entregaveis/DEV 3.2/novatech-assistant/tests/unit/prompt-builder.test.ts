import { describe, it, expect } from "vitest";
import { buildPrompt } from "../../src/services/prompt-builder.js";
import type { Chunk } from "../../src/shared/types.js";

const SYSTEM_PROMPT = "Você é o assistente NovaTech. Use apenas os documentos fornecidos.";

const baseChunks: Chunk[] = [
  {
    id: "1",
    content: "Política de devolução: 30 dias.",
    source_document: "POL-001",
    vigencia: "2024-01-15",
  },
  {
    id: "2",
    content: "SLA Platinum: 24h em capitais.",
    source_document: "SLA-2024",
    vigencia: "2024-03-01",
  },
];

describe("buildPrompt", () => {
  it("builds prompt with system and user parts", () => {
    const { system, user } = buildPrompt(SYSTEM_PROMPT, baseChunks, "Qual o prazo de devolução?");
    expect(system).toBe(SYSTEM_PROMPT);
    expect(user).toContain("Qual o prazo de devolução?");
    expect(user).toContain("POL-001");
    expect(user).toContain("SLA-2024");
  });

  it("includes source document names in context", () => {
    const { user } = buildPrompt(SYSTEM_PROMPT, baseChunks, "pergunta");
    expect(user).toContain("[POL-001");
    expect(user).toContain("[SLA-2024");
  });

  it("includes vigencia metadata in context", () => {
    const { user } = buildPrompt(SYSTEM_PROMPT, baseChunks, "pergunta");
    expect(user).toContain("vigência: 2024-01-15");
    expect(user).toContain("vigência: 2024-03-01");
  });

  it("orders chunks by vigencia descending (most recent first)", () => {
    const { user } = buildPrompt(SYSTEM_PROMPT, baseChunks, "pergunta");
    const pos1 = user.indexOf("SLA-2024");
    const pos2 = user.indexOf("POL-001");
    expect(pos1).toBeLessThan(pos2);
  });

  it("works with empty chunks array", () => {
    const { system, user } = buildPrompt(SYSTEM_PROMPT, [], "pergunta?");
    expect(system).toBe(SYSTEM_PROMPT);
    expect(user).toContain("pergunta?");
  });

  it("respects chunk budget — omits chunks that exceed 8K tokens", () => {
    const bigChunk: Chunk = {
      id: "big",
      content: "x".repeat(32000),
      source_document: "BIG-DOC",
      vigencia: "2024-12-01",
    };
    const smallChunk: Chunk = {
      id: "small",
      content: "small content",
      source_document: "SMALL-DOC",
      vigencia: "2023-01-01",
    };

    const { user } = buildPrompt(SYSTEM_PROMPT, [bigChunk, smallChunk], "pergunta");
    expect(user).toContain("BIG-DOC");
    expect(user).not.toContain("SMALL-DOC");
  });

  it("throws if system prompt exceeds 4K token budget", () => {
    const hugeSystemPrompt = "s".repeat(17000);
    expect(() => buildPrompt(hugeSystemPrompt, baseChunks, "pergunta")).toThrow();
  });
});
