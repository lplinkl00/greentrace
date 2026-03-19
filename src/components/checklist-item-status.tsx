'use client'

import { useEffect, useState } from 'react'

type ItemStatus = {
  status: string
  assignee: { name: string } | null
  dueDate: string | null
}

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  NOT_APPLICABLE: 'N/A',
}

export function ChecklistItemStatus({ itemId }: { itemId: string }) {
  const [item, setItem] = useState<ItemStatus | null>(null)

  useEffect(() => {
    fetch(`/api/checklist-items/${itemId}`)
      .then(r => r.json())
      .then(d => d.data && setItem(d.data))
  }, [itemId])

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="font-semibold text-gray-800 mb-4">Status</h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Status</span>
          <span className="font-medium">
            {item ? (STATUS_LABELS[item.status] ?? item.status) : '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Assignee</span>
          <span className="font-medium">
            {item ? (item.assignee?.name ?? 'Unassigned') : '—'}
          </span>
        </div>
        {item?.dueDate && (
          <div className="flex justify-between">
            <span className="text-gray-500">Due</span>
            <span className="font-medium">
              {new Date(item.dueDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
