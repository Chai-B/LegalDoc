'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, File, X, CheckCircle2, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

interface FileUploadProps {
  onFile: (file: File, text: string) => void
  onClear?: () => void
}

export function FileUpload({ onFile, onClear }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processFile = useCallback(async (f: File) => {
    setLoading(true)
    setFile(null)
    setError(null)
    try {
      const data = await api.extractFile(f)
      const text = data.text || ''
      if (!text.trim()) throw new Error('No text could be extracted from this file')
      setFile(f)
      onFile(f, text)
    } catch (e: any) {
      setFile(null)
      setError(e.message || 'Failed to read file')
    } finally {
      setLoading(false)
    }
  }, [onFile])

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) processFile(accepted[0])
  }, [processFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024,
  })

  const reset = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFile(null)
    setError(null)
    onClear?.()
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="wait">
        {file ? (
          <motion.div
            key="file"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex items-center gap-3 p-4 rounded-[14px] border border-card-border-hover bg-white/[0.04]"
          >
            <div className="w-9 h-9 rounded-[10px] border border-card-border-hover bg-white/[0.04] flex items-center justify-center flex-shrink-0">
              <File className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB · Ready</p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            <button onClick={reset} className="text-muted hover:text-foreground transition-colors ml-1">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="drop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              {...getRootProps()}
              className={cn(
                'relative border border-dashed rounded-[16px] p-8 text-center cursor-pointer transition-all duration-200 overflow-hidden bg-white/[0.018]',
                isDragActive
                  ? 'border-accent bg-accent/[0.08]'
                  : 'border-card-border-hover hover:border-card-border-hover hover:bg-white/[0.03]'
              )}
            >
            <input {...getInputProps()} />
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
            <div className="flex flex-col items-center gap-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-[12px] flex items-center justify-center transition-colors border border-card-border-hover',
                  isDragActive ? 'bg-accent/15' : 'bg-white/[0.035]'
                )}
              >
                <Upload className={cn('w-5 h-5', isDragActive ? 'text-accent' : 'text-muted')} />
              </div>
              {loading ? (
                <div className="space-y-2">
                  <div className="h-1 w-28 bg-accent/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-accent rounded-full"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                  <p className="text-sm text-muted">Extracting text…</p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      {isDragActive ? 'Drop it here' : 'Drop your document here'}
                    </p>
                    <p className="text-xs text-muted">PDF, DOCX, or TXT · Max 10 MB</p>
                  </div>
                  <span className="text-xs border border-card-border-hover text-accent px-3 py-1 rounded-full hover:bg-white/[0.05] transition-colors">
                    Browse files
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-dark">
                    <ShieldCheck className="w-3 h-3" />
                    Extracted in-session only
                  </span>
                </>
              )}
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-400 px-1"
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}
