export interface Chunk {
  id: string;
  content: string;
  source_document: string;
  vigencia?: string;
  score?: number;
}

export interface QueryRequest {
  question: string;
}

export interface QueryResponse {
  answer: string;
  source_documents: string[];
}

export interface PromptMessages {
  system: string;
  user: string;
}
