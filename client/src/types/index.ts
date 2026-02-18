export interface Document {
  id: string;
  filename: string;
  original_name: string;
  total_pages: number;
  total_chunks: number;
  status: "processing" | "ready" | "error";
  error_message?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  model?: string;
  timestamp: Date;
}

export interface Source {
  filename: string;
  page_number: number;
  excerpt: string;
  similarity: number;
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
  model: string;
}