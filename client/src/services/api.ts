import axios from 'axios'
import { Document, ChatResponse, UploadResponse } from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

export const documentApi = {
  list: () => 
    api.get<Document[]>('/documents'),
  
  delete: (id: string) => 
    api.delete(`/documents/${id}`)
}

export const uploadApi = {
  single: (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData()
    formData.append('file', file)
    
    return api.post<UploadResponse>('/upload/single', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      }
    })
  },
  
  multiple: (files: File[]) => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    
    return api.post('/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

export const chatApi = {
  sendMessage: async (
    messages: Array<{ role: string; content: string }>,
    documentIds?: string[]
  ): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>('/chat', {
      messages,
      documentIds
    })
    return response.data
  },
  
  streamMessage: (
    messages: Array<{ role: string; content: string }>,
    documentIds?: string[],
    onChunk: (content: string) => void,
    onComplete: (citations: any[], confidence: number) => void,
    onError: (error: Error) => void
  ) => {
    const fetchStream = async () => {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            documentIds,
            stream: true
          })
        })

        if (!response.ok) {
          throw new Error('Stream request failed')
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('No reader available')
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  onChunk(parsed.content)
                }
                if (parsed.done) {
                  onComplete(parsed.citations || [], parsed.confidence || 0)
                }
              } catch {
                // Skip parse errors
              }
            }
          }
        }
      } catch (error) {
        onError(error as Error)
      }
    }

    fetchStream()
  },
  
  compare: (documentIds: string[], query: string) =>
    api.post('/chat/compare', { documents: documentIds, query })
}

export default api