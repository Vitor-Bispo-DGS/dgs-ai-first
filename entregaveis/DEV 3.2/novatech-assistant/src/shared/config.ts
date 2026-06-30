function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

export const config = {
  azureOpenAI: {
    endpoint: optionalEnv("AZURE_OPENAI_ENDPOINT", ""),
    apiKey: optionalEnv("AZURE_OPENAI_API_KEY", ""),
    embeddingDeployment: optionalEnv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-small"),
    chatDeployment: optionalEnv("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4o"),
  },
  azureSearch: {
    endpoint: optionalEnv("AZURE_SEARCH_ENDPOINT", ""),
    apiKey: optionalEnv("AZURE_SEARCH_API_KEY", ""),
    indexName: optionalEnv("AZURE_SEARCH_INDEX_NAME", "novatech-chunks"),
  },
  cosmos: {
    connectionString: optionalEnv("COSMOS_CONNECTION_STRING", ""),
    databaseName: optionalEnv("COSMOS_DATABASE_NAME", "novatech"),
    containerName: optionalEnv("COSMOS_CONTAINER_NAME", "feedbacks"),
  },
  systemPromptPath: optionalEnv("SYSTEM_PROMPT_PATH", "./prompts/system-prompt.md"),
  logLevel: optionalEnv("LOG_LEVEL", "info") as "trace" | "debug" | "info" | "warn" | "error",
  chatTimeoutMs: parseInt(optionalEnv("CHAT_TIMEOUT_MS", "30000"), 10),
} as const;

export type Config = typeof config;
