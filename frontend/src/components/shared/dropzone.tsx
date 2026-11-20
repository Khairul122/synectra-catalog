'use client';

import { useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { translate, type Locale } from '@/lib/i18n';

interface DropzoneProps {
  accept?: string;
  onFile: (file: File) => void;
  label: string;
  hint?: string;
  /** 0-100 while uploading, null when idle. */
  progress?: number | null;
  done?: boolean;
  preview?: ReactNode;
  className?: string;
}

export function Dropzone({ accept, onFile, label, hint, progress = null, done, preview, className }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      animate={{ scale: dragging ? 1.02 : 1 }}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed p-5 text-center transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        dragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-muted/40',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      {preview ?? (
        <motion.div animate={dragging ? { y: -6, scale: 1.1 } : { y: 0, scale: 1 }} className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UploadCloud className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
        </motion.div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>

      <AnimatePresence>
        {progress !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-0 bottom-0 h-1.5 bg-muted">
            <motion.div className="h-full bg-primary" animate={{ width: `${progress}%` }} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {done && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute right-2 top-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** PUT a file to a signed upload URL, reporting percent progress. */
export function putWithProgress(url: string, file: File, onProgress: (pct: number) => void, locale: Locale): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100)));
    xhr.addEventListener('load', () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(translate(locale, 'common.uploadFailed', { status: xhr.status })))));
    xhr.addEventListener('error', () => reject(new Error(translate(locale, 'common.uploadNetwork'))));
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}
