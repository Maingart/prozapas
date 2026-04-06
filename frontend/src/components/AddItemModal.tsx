import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { itemsApi } from '../api/items'

interface AddItemModalProps {
  isOpen: boolean
  onClose: () => void
  spaceId: number
}

export default function AddItemModal({ isOpen, onClose, spaceId }: AddItemModalProps) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState<string>('1')
  const [unit, setUnit] = useState('шт')
  const [minQuantity, setMinQuantity] = useState<string>('1')
  const [location, setLocation] = useState('')
  const [isConsumable, setIsConsumable] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: { name: string; quantity: number; unit: string; min_quantity: number; location: string; is_consumable: boolean }) =>
      itemsApi.create(spaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', spaceId] })
      resetForm()
      onClose()
    },
    onError: (err: any) => {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail
      let msg = 'Не удалось создать товар'
      if (status === 403 || status === 401) {
        msg = 'Ошибка авторизации. Войдите заново.'
      } else if (detail) {
        msg = typeof detail === 'string' ? detail : JSON.stringify(detail)
      }
      setError(msg)
    },
  })

  const resetForm = () => {
    setName('')
    setQuantity('1')
    setUnit('шт')
    setMinQuantity('1')
    setLocation('')
    setIsConsumable(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return

    const token = localStorage.getItem('token')
    if (!token) {
      setError('Не авторизованы. Войдите заново.')
      return
    }

    console.log('[AddItem] spaceId:', spaceId, 'token present:', !!token, 'url:', `/spaces/${spaceId}/items`)

    createMutation.mutate({
      name: name.trim(),
      quantity: quantity === '' ? 0 : Number(quantity),
      unit,
      min_quantity: minQuantity === '' ? 0 : Number(minQuantity),
      location: location.trim() || undefined as unknown as string,
      is_consumable: isConsumable,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-md">
        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <h2 className="text-lg font-bold text-slate-900 mb-4">Новый товар</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="item-name" className="block text-sm font-medium text-slate-700 mb-1.5">
              Название *
            </label>
            <input
              id="item-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Например: Молоко"
              className="input-field"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="item-qty" className="block text-sm font-medium text-slate-700 mb-1.5">
                Количество
              </label>
              <input
                id="item-qty"
                type="text"
                inputMode="numeric"
                value={quantity}
                onChange={e => {
                  const val = e.target.value
                  if (val === '' || val === '-' || /^\d+$/.test(val)) {
                    setQuantity(val)
                  }
                }}
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="item-unit" className="block text-sm font-medium text-slate-700 mb-1.5">
                Единица
              </label>
              <input
                id="item-unit"
                type="text"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="шт"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label htmlFor="item-min" className="block text-sm font-medium text-slate-700 mb-1.5">
              Мин. остаток
            </label>
            <input
              id="item-min"
              type="text"
              inputMode="numeric"
              value={minQuantity}
              onChange={e => {
                const val = e.target.value
                if (val === '' || val === '-' || /^\d+$/.test(val)) {
                  setMinQuantity(val)
                }
              }}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="item-location" className="block text-sm font-medium text-slate-700 mb-1.5">
              Место хранения
            </label>
            <input
              id="item-location"
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Например: Холодильник"
              className="input-field"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="item-consumable"
              type="checkbox"
              checked={isConsumable}
              onChange={e => setIsConsumable(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="item-consumable" className="text-sm text-slate-700">
              Расходуемый товар
            </label>
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
              disabled={createMutation.isPending || !name.trim() || quantity === '' || minQuantity === ''}
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
