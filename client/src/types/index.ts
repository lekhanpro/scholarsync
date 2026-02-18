export interface Document {
  id: string
  file_name: string
  total_chunks: number
  total_pages: number
  status: string
  created_at: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  citations?: Citation[]
}

export interface Citation {
  fileName: string
  pageNumber: number
  excerpt: string
}

export interface ChatResponse {
  answer: string
  citations: Citation[]
  confidence: number
}

export interface UploadResponse {
  message: string
  document: Document
}

export interface UploadError {
  error: string
  details?: string
  documentId?: string
}