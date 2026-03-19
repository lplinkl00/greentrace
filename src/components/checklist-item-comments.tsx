'use client'

import { useEffect, useState } from 'react'

type Comment = {
  id: string
  body: string
  createdAt: string
  author: { name: string; role: string }
}

export function ChecklistItemComments({ itemId }: { itemId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function loadComments() {
    fetch(`/api/checklist-items/${itemId}`)
      .then(r => r.json())
      .then(d => d.data?.comments && setComments(d.data.comments))
      .catch(() => {})
  }

  useEffect(() => { loadComments() }, [itemId])

  async function handlePost() {
    if (!body.trim()) return
    setPosting(true)
    setError(null)
    try {
      const res = await fetch(`/api/checklist-items/${itemId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      if (res.ok) {
        setBody('')
        loadComments()
      } else {
        const json = await res.json().catch(() => ({}))
        setError(json?.error?.message ?? 'Failed to post comment.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="font-semibold text-gray-800 mb-4">Comments</h2>
      <div className="space-y-3 text-sm text-gray-700">
        {comments.length === 0 && <p className="text-gray-500">No comments yet.</p>}
        {comments.map(c => (
          <div key={c.id} className="border-b pb-2">
            <p className="font-medium">
              {c.author.name}{' '}
              <span className="text-gray-400 font-normal">
                · {new Date(c.createdAt).toLocaleString()}
              </span>
            </p>
            <p className="mt-0.5">{c.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t pt-4">
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
        <textarea
          className="w-full border rounded-md p-2 text-sm"
          rows={2}
          placeholder="Add a comment…"
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        <button
          onClick={handlePost}
          disabled={posting || !body.trim()}
          className="mt-2 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50"
        >
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  )
}
