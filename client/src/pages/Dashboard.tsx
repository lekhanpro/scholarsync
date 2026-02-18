import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, 
  Sparkles, 
  FileText, 
  Trash2, 
  Plus, 
  MessageSquare,
  ChevronDown,
  Bot,
  User,
  Loader2
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import axios from 'axios'
import FileUpload from '../components/FileUpload'
import toast from 'react-hot-toast'

interface Document {
  id: string
  file_name: string
  total_chunks: number
  total_pages: number
  status: string
  created_at: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  timestamp: Date
}

interface Citation {
  fileName: string
  pageNumber: number
  excerpt: string
}

const Dashboard: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [showDocPanel, setShowDocPanel] = useState(false)
  const [showUploadPanel, setShowUploadPanel] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('/api/documents')
      setDocuments(response.data)
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    }
  }

  const handleUploadComplete = () => {
    fetchDocuments()
    setShowUploadPanel(false)
    toast.success('Documents processed and ready for queries!')
  }

  const toggleDocument = (docId: string) => {
    setSelectedDocs(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    )
  }

  const selectAllDocuments = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([])
    } else {
      setSelectedDocs(documents.map(d => d.id))
    }
  }

  const deleteDocument = async (docId: string) => {
    try {
      await axios.delete(`/api/documents/${docId}`)
      setDocuments(prev => prev.filter(d => d.id !== docId))
      setSelectedDocs(prev => prev.filter(id => id !== docId))
      toast.success('Document deleted')
    } catch (error) {
      toast.error('Failed to delete document')
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading || isStreaming) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          documentIds: selectedDocs.length > 0 ? selectedDocs : undefined,
          stream: true
        })
      })

      if (!response.ok) {
        throw new Error('Chat request failed')
      }

      setIsLoading(false)
      setIsStreaming(true)
      setMessages(prev => [...prev, assistantMessage])

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No reader available')
      }

      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            
            try {
              const parsed = JSON.parse(data)
              
              if (parsed.content) {
                accumulatedContent += parsed.content
                setMessages(prev => prev.map(m => 
                  m.id === assistantMessageId 
                    ? { ...m, content: accumulatedContent }
                    : m
                ))
              }
              
              if (parsed.done && parsed.citations) {
                setMessages(prev => prev.map(m => 
                  m.id === assistantMessageId 
                    ? { ...m, citations: parsed.citations }
                    : m
                ))
              }
            } catch (e) {
              // Skip parse errors
            }
          }
        }
      }

      setIsStreaming(false)

    } catch (error: any) {
      setIsLoading(false)
      setIsStreaming(false)
      
      const errorMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
      toast.error('Failed to get response')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const suggestedQuestions = [
    "Summarize the key concepts from my uploaded notes",
    "Compare how each document explains pointers",
    "What are the main topics covered in my study materials?",
    "Create a study guide based on my documents"
  ]

  return (
    <div className="flex h-full">
      {/* Sidebar - Document Panel */}
      <AnimatePresence>
        {showDocPanel && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-white/10 bg-glass-dark overflow-hidden"
          >
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Documents</h3>
                <button
                  onClick={() => setShowUploadPanel(true)}
                  className="p-1.5 rounded-lg glass-button text-xs flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>

              {documents.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <FileText className="w-12 h-12 text-white/20 mb-3" />
                  <p className="text-sm text-white/40">No documents uploaded</p>
                  <p className="text-xs text-white/30 mt-1">Upload PDFs to start chatting</p>
                </div>
              ) : (
                <>
                  <button
                    onClick={selectAllDocuments}
                    className="text-xs text-accent-primary hover:text-accent-primary/80 mb-2"
                  >
                    {selectedDocs.length === documents.length ? 'Deselect all' : 'Select all'}
                  </button>
                  
                  <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2">
                    {documents.map(doc => (
                      <div
                        key={doc.id}
                        className={`glass-card p-3 cursor-pointer transition-all ${
                          selectedDocs.includes(doc.id) 
                            ? 'border-accent-primary/50 bg-accent-primary/10' 
                            : ''
                        }`}
                        onClick={() => toggleDocument(doc.id)}
                      >
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-accent-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{doc.file_name}</p>
                            <p className="text-xs text-white/40 mt-0.5">
                              {doc.total_pages} pages • {doc.total_chunks} chunks
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteDocument(doc.id)
                            }}
                            className="p-1 rounded hover:bg-white/10"
                          >
                            <Trash2 className="w-3 h-3 text-white/40 hover:text-accent-error" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {selectedDocs.length > 0 && (
                <div className="mt-4 p-3 glass-card">
                  <p className="text-xs text-white/60">
                    {selectedDocs.length} document{selectedDocs.length > 1 ? 's' : ''} selected
                  </p>
                  {selectedDocs.length > 1 && (
                    <p className="text-xs text-accent-primary mt-1">
                      Cross-document queries enabled
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-white">ScholarSync</h1>
              <p className="text-xs text-white/40">AI Study Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDocPanel(!showDocPanel)}
              className={`p-2 rounded-lg transition-colors ${
                showDocPanel ? 'glass-button' : 'hover:bg-white/5'
              }`}
            >
              <FileText className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setMessages([])
                toast.success('Chat cleared')
              }}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center mb-6"
              >
                <Sparkles className="w-10 h-10 text-accent-primary" />
              </motion.div>
              
              <h2 className="text-2xl font-semibold gradient-text mb-2">
                Welcome to ScholarSync
              </h2>
              <p className="text-white/40 max-w-md mb-6">
                Upload your study materials and ask questions to get AI-powered answers with citations from your documents.
              </p>

              {documents.length === 0 ? (
                <button
                  onClick={() => setShowUploadPanel(true)}
                  className="glass-button px-6 py-3 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Upload Documents
                </button>
              ) : (
                <div className="w-full max-w-2xl">
                  <p className="text-sm text-white/60 mb-3">Try asking:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(q)}
                        className="glass-card p-3 text-left text-sm text-white/60 hover:text-white hover:border-white/20 transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-accent-primary/20' 
                    : 'bg-gradient-to-br from-accent-primary to-accent-secondary'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-accent-primary" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                
                <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`glass-card p-4 ${
                    message.role === 'user' ? 'bg-accent-primary/10 border-accent-primary/20' : ''
                  }`}>
                    {message.role === 'assistant' ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-white">{message.content}</p>
                    )}

                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-xs text-white/40 mb-2">Sources:</p>
                        <div className="flex flex-wrap gap-2">
                          {message.citations.map((citation, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-1 rounded bg-white/5 text-white/60"
                            >
                              📄 {citation.fileName}, p.{citation.pageNumber}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-white/30 mt-1 px-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))
          )}
          
          {(isLoading || isStreaming) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-accent-primary to-accent-secondary">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="glass-card p-4">
                {isStreaming ? (
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
                    <span className="text-sm text-white/60">Thinking...</span>
                  </div>
                ) : (
                  <Loader2 className="w-4 h-4 text-accent-primary animate-spin" />
                )}
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10">
          <div className="glass-card p-2 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={documents.length === 0 
                ? "Upload documents to start chatting..." 
                : "Ask a question about your documents..."
              }
              rows={1}
              disabled={isLoading || isStreaming || documents.length === 0}
              className="flex-1 bg-transparent border-none resize-none outline-none text-white placeholder:text-white/40 text-sm p-2 min-h-[40px] max-h-[120px] disabled:opacity-50"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 120) + 'px'
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || isStreaming || documents.length === 0}
              className="p-2.5 rounded-lg glass-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {documents.length === 0 && (
            <p className="text-xs text-center text-white/30 mt-2">
              <button 
                onClick={() => setShowUploadPanel(true)}
                className="text-accent-primary hover:underline"
              >
                Upload documents
              </button> to start asking questions
            </p>
          )}
        </div>
      </div>

      {/* Upload Panel Overlay */}
      <AnimatePresence>
        {showUploadPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUploadPanel(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel p-6 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Upload Documents</h2>
                <button
                  onClick={() => setShowUploadPanel(false)}
                  className="p-1 rounded-lg hover:bg-white/10"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
              
              <FileUpload onUploadComplete={handleUploadComplete} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Dashboard