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
  source_document: string[];
  confidence_score: number;
}

export interface PromptMessages {
  system: string;
  user: string;
}

export interface FeedbackRequest {
  queryId: string;
  rating: number;
  comment: string;
  attendantEmail: string;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
  feedbackId?: string;
}

export interface FeedbackRecord {
  id: string;
  queryId: string;
  rating: number;
  comment: string;
  attendantEmail: string;
  timestamp: string;
}
