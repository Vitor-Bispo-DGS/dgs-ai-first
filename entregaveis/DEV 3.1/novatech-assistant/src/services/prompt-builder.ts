import { readFile } from "fs/promises";
import { config } from "../shared/config.js";
import { SystemPromptError } from "../shared/errors.js";
import type { Chunk } from "../shared/types.js";

const SYSTEM_PROMPT_TOKEN_BUDGET = 4000;
const CHUNKS_TOKEN_BUDGET = 8000;
const CHARS_PER_TOKEN = 4;

let cachedSystemPrompt: string | null = null;

export async function initSystemPrompt(): Promise<void> {
  const path = config.systemPromptPath;
  try {
    cachedSystemPrompt = await readFile(path, "utf-8");
  } catch (error) {
    throw new SystemPromptError(`Failed to read system prompt from ${path}`, error);
  }
}

export function getSystemPrompt(): string {
  if (cachedSystemPrompt === null) {
    throw new SystemPromptError("System prompt not initialized. Call initSystemPrompt() first.");
  }
  return cachedSystemPrompt;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function sortChunksByVigencia(chunks: Chunk[]): Chunk[] {
  return [...chunks].sort((a, b) => {
    if (!a.vigencia && !b.vigencia) return 0;
    if (!a.vigencia) return 1;
    if (!b.vigencia) return -1;
    return new Date(b.vigencia).getTime() - new Date(a.vigencia).getTime();
  });
}

export function buildPrompt(
  systemPrompt: string,
  chunks: Chunk[],
  question: string
): { system: string; user: string } {
  const systemTokens = estimateTokens(systemPrompt);
  if (systemTokens > SYSTEM_PROMPT_TOKEN_BUDGET) {
    throw new SystemPromptError(
      `System prompt exceeds budget: ${systemTokens} tokens (max ${SYSTEM_PROMPT_TOKEN_BUDGET})`
    );
  }

  const sortedChunks = sortChunksByVigencia(chunks);
  const selectedChunks: Chunk[] = [];
  let usedTokens = 0;

  for (const chunk of sortedChunks) {
    const chunkTokens = estimateTokens(chunk.content);
    if (usedTokens + chunkTokens <= CHUNKS_TOKEN_BUDGET) {
      selectedChunks.push(chunk);
      usedTokens += chunkTokens;
    }
  }

  const context = selectedChunks
    .map((c) => `[${c.source_document}${c.vigencia ? ` | vigência: ${c.vigencia}` : ""}]\n${c.content}`)
    .join("\n\n---\n\n");

  const userMessage = `Contexto:\n\n${context}\n\n---\n\nPergunta: ${question}`;

  return { system: systemPrompt, user: userMessage };
}
