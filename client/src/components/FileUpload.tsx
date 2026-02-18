import React, { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

interface UploadedFile {
  id: string
  name: string
  size: number
  status: 'pending' | 'processing' | 'success' | 'error'
  progress: number
  documentId?: string
  error?: string
}

interface FileUploadProps {
  onUploadComplete?: (files: UploadedFile[]) => void
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf')
    
    if (pdfFiles.length === 0) {
      toast.error('Only PDF files are supported')
      return
    }

    if (pdfFiles.length < droppedFiles.length) {
      toast.error(`${droppedFiles.length - pdfFiles.length} non-PDF files were skipped`)
    }

    addFiles(pdfFiles)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf')
    
    if (pdfFiles.length === 0) {
      toast.error('Only PDF files are supported')
      return
    }

    addFiles(pdfFiles)
    e.target.value = ''
  }, [])

  const addFiles = (newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      status: 'pending',
      progress: 0
    }))
    
    setFiles(prev => [...prev, ...uploadedFiles])
    uploadFiles(newFiles, uploadedFiles.map(f => f.id))
  }

  const uploadFiles = async (filesToUpload: File[], fileIds: string[]) => {
    setIsUploading(true)

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i]
      const fileId = fileIds[i]

      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'processing', progress: 10 } : f
      ))

      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await axios.post('/api/upload/single', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total 
              ? Math.round((progressEvent.loaded * 50) / progressEvent.total)
              : 50
            setFiles(prev => prev.map(f => 
              f.id === fileId ? { ...f, progress } : f
            ))
          }
        })

        setFiles(prev => prev.map(f => 
          f.id === fileId ? { 
            ...f, 
            status: 'success', 
            progress: 100,
            documentId: response.data.document.id
          } : f
        ))

        toast.success(`${file.name} uploaded successfully`)

      } catch (error: any) {
        const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Upload failed'
        
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { 
            ...f, 
            status: 'error', 
            progress: 0,
            error: errorMessage
          } : f
        ))

        toast.error(`Failed to upload ${file.name}: ${errorMessage}`)
      }
    }

    setIsUploading(false)
    const completedFiles = files.filter(f => f.status === 'success')
    if (completedFiles.length > 0 && onUploadComplete) {
      onUploadComplete(completedFiles)
    }
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'success'))
  }

  return (
    <div className="w-full space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer
          ${isDragging 
            ? 'border-accent-primary bg-accent-primary/10 scale-[1.02]' 
            : 'border-white/20 hover:border-white/30 hover:bg-white/5'
          }`}
      >
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <motion.div
          animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Upload className={`w-12 h-12 mx-auto mb-4 transition-colors duration-300
            ${isDragging ? 'text-accent-primary' : 'text-white/40'}`}
          />
        </motion.div>

        <p className="text-white/60 mb-2">
          <span className="text-accent-primary font-medium">Click to upload</span> or drag and drop
        </p>
        <p className="text-sm text-white/40">
          PDF files only (max 50MB each)
        </p>
      </div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">
                {files.filter(f => f.status === 'success').length}/{files.length} uploaded
              </span>
              {files.some(f => f.status === 'success') && (
                <button
                  onClick={clearCompleted}
                  className="text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
                >
                  Clear completed
                </button>
              )}
            </div>

            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass-card p-3 flex items-center gap-3"
              >
                <FileText className="w-5 h-5 text-accent-primary flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  <p className="text-xs text-white/40">{formatFileSize(file.size)}</p>
                  
                  {file.status === 'processing' && (
                    <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-accent-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}

                  {file.status === 'error' && file.error && (
                    <p className="text-xs text-accent-error mt-1">{file.error}</p>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {file.status === 'pending' && (
                    <div className="w-5 h-5 rounded-full border-2 border-white/20" />
                  )}
                  {file.status === 'processing' && (
                    <Loader2 className="w-5 h-5 text-accent-primary animate-spin" />
                  )}
                  {file.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-accent-success" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-accent-error" />
                  )}
                </div>

                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-white/40 hover:text-white" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default FileUpload