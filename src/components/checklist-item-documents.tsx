'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Doc = {
  id: string
  displayName: string
  fileType: string
  fileSize: number
  uploadedAt: string
}

export function ChecklistItemDocuments({ itemId }: { itemId: string }) {
  const [documents, setDocuments] = useState<Doc[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function loadDocuments() {
    fetch(`/api/checklist-items/${itemId}`)
      .then(r => r.json())
      .then(d => d.data?.documents && setDocuments(d.data.documents))
      .catch(() => {})
  }

  useEffect(() => { loadDocuments() }, [itemId])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const MAX_MB = 25
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_MB} MB limit`)
      return
    }

    setUploading(true)
    setError(null)

    try {
      const filePath = `checklist-items/${itemId}/${Date.now()}-${file.name}`
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (storageError) {
        setError('Upload failed: ' + storageError.message)
        return
      }

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: file.name,
          filePath,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          linkedEntityType: 'CHECKLIST_ITEM',
          checklistItemId: itemId,
        }),
      })

      if (res.ok) {
        loadDocuments()
        if (inputRef.current) inputRef.current.value = ''
      } else {
        const json = await res.json().catch(() => ({}))
        setError(json?.error?.message ?? 'Failed to register document.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="font-semibold text-gray-800 mb-4">Documents</h2>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <p className="text-sm text-gray-500">Drag & drop files here, or click to browse</p>
        <p className="text-xs text-gray-400 mt-1">PDF, JPEG, PNG, XLSX, CSV, DOCX — max 25 MB</p>
        <input
          ref={inputRef}
          type="file"
          className="mt-2"
          accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv,.docx"
          onChange={handleFile}
          disabled={uploading}
        />
        {uploading && <p className="text-xs text-blue-500 mt-2">Uploading…</p>}
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>
      <div className="mt-4">
        {documents.length === 0 ? (
          <p className="text-sm text-gray-500">No documents uploaded yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {documents.map(d => (
              <li key={d.id} className="flex items-center justify-between border rounded p-2">
                <span className="truncate max-w-xs text-gray-700">{d.displayName}</span>
                <span className="text-xs text-gray-400 ml-2">
                  {(d.fileSize / 1024).toFixed(1)} KB
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
