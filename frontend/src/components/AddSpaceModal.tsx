import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { spacesApi } from '../api/items'

interface AddSpaceModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AddSpaceModal({ isOpen, onClose }: AddSpaceModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      spacesApi.create(name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] })
      setName('')
      setDescription('')
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate({ name: name.trim(), description: description.trim() || undefined })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-md">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Новое пространство</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="space-name" className="block text-sm font-medium text-slate-700 mb-1.5">
              Название *
            </label>
            <input
              id="space-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Например: Офис"
              className="input-field"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="space-desc" className="block text-sm font-medium text-slate-700 mb-1.5">
              Описание
            </label>
            <textarea
              id="space-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Краткое описание..."
              rows={3}
              className="input-field resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !name.trim()}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
