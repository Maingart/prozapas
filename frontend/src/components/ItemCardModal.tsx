import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { itemsApi, Item, QuantitySnapshot } from '../api/items'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

interface ItemCardModalProps {
  isOpen: boolean
  onClose: () => void
  item: Item | null
  spaceId: number
}

export default function ItemCardModal({ isOpen, onClose, item, spaceId }: ItemCardModalProps) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState<string>('0')
  const [unit, setUnit] = useState('шт')
  const [minQuantity, setMinQuantity] = useState<string>('0')
  const [location, setLocation] = useState('')
  const [isConsumable, setIsConsumable] = useState(true)

  // Sync form with item
  useEffect(() => {
    if (item) {
      setName(item.name)
      setQuantity(String(item.quantity))
      setUnit(item.unit)
      setMinQuantity(String(item.min_quantity))
      setLocation(item.location || '')
      setIsConsumable(item.is_consumable)
      setMode('view')
      setShowDeleteConfirm(false)
    }
  }, [item])

  // Fetch fresh data
  const { data: freshItem } = useQuery({
    queryKey: ['item', spaceId, item?.id],
    queryFn: () => (item ? itemsApi.getOne(spaceId, item.id) : Promise.resolve(null)),
    enabled: isOpen && !!item,
  })

  const displayItem = freshItem || item

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; quantity?: number; unit?: string; min_quantity?: number; location?: string; is_consumable?: boolean }) =>
      itemsApi.update(spaceId, displayItem!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', spaceId] })
      queryClient.invalidateQueries({ queryKey: ['item', spaceId, displayItem!.id] })
      queryClient.invalidateQueries({ queryKey: ['itemHistory', spaceId, displayItem!.id] })
      setMode('view')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => itemsApi.delete(spaceId, displayItem!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', spaceId] })
      onClose()
    },
  })

  const addMutation = useMutation({
    mutationFn: (qty: number) => itemsApi.add(spaceId, displayItem!.id, qty),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', spaceId] })
      queryClient.invalidateQueries({ queryKey: ['item', spaceId, displayItem!.id] })
      queryClient.invalidateQueries({ queryKey: ['itemHistory', spaceId, displayItem!.id] })
    },
  })

  const consumeMutation = useMutation({
    mutationFn: (qty: number) => itemsApi.consume(spaceId, displayItem!.id, qty),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', spaceId] })
      queryClient.invalidateQueries({ queryKey: ['item', spaceId, displayItem!.id] })
      queryClient.invalidateQueries({ queryKey: ['itemHistory', spaceId, displayItem!.id] })
    },
  })

  // Fetch history
  const { data: history } = useQuery({
    queryKey: ['itemHistory', spaceId, displayItem?.id],
    queryFn: () => itemsApi.getHistory(spaceId, displayItem!.id),
    enabled: isOpen && !!displayItem,
    refetchOnWindowFocus: false,
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    updateMutation.mutate({
      name: name.trim(),
      quantity: quantity === '' ? 0 : Number(quantity),
      unit,
      min_quantity: minQuantity === '' ? 0 : Number(minQuantity),
      location: location.trim() || undefined as unknown as string,
      is_consumable: isConsumable,
    })
  }

  const handleQuickAdd = (qty: number) => {
    addMutation.mutate(qty)
  }

  const handleQuickConsume = (qty: number) => {
    consumeMutation.mutate(Math.min(qty, displayItem?.quantity ?? 0))
  }

  if (!isOpen || !displayItem) return null

  const isLow = displayItem.quantity <= displayItem.min_quantity
  const isPending = updateMutation.isPending || deleteMutation.isPending || addMutation.isPending || consumeMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{displayItem.name}</h2>
              {isLow && <span className="badge-red text-xs">мало</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {mode === 'view' ? (
          <>
            {/* Quantity display */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Количество</p>
                  <p className={`text-3xl font-bold font-mono ${isLow ? 'text-red-600' : 'text-slate-900'}`}>
                    {displayItem.quantity}
                    <span className="text-lg text-slate-400 ml-1">{displayItem.unit}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Мин. остаток: {displayItem.min_quantity}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleQuickConsume(1)}
                    disabled={isPending || displayItem.quantity <= 0}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Расходовать 1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleQuickConsume(5)}
                    disabled={isPending || displayItem.quantity <= 0}
                    className="px-2 py-1 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    -5
                  </button>
                  <button
                    onClick={() => handleQuickAdd(1)}
                    disabled={isPending}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Добавить 1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleQuickAdd(5)}
                    disabled={isPending}
                    className="px-2 py-1 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +5
                  </button>
                </div>
              </div>
            </div>

            {/* Details */}
            <dl className="space-y-3 mb-6">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Место хранения</dt>
                <dd className="text-sm text-slate-900">{displayItem.location || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Тип</dt>
                <dd className="text-sm text-slate-900">{displayItem.is_consumable ? 'Расходуемый' : 'Не расходуемый'}</dd>
              </div>
            </dl>

            {/* Quantity history chart */}
            {history && history.length > 1 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Динамика остатков</h3>
                <div className="bg-slate-50 rounded-xl p-3">
                  <QuantityChart history={history} unit={displayItem.unit} />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setMode('edit')}
                className="flex-1 btn-secondary"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Редактировать
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Edit form */}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Название *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-qty" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Количество
                  </label>
                  <input
                    id="edit-qty"
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
                  <label htmlFor="edit-unit" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Единица
                  </label>
                  <input
                    id="edit-unit"
                    type="text"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-min" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Мин. остаток
                </label>
                <input
                  id="edit-min"
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
                <label htmlFor="edit-location" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Место хранения
                </label>
                <input
                  id="edit-location"
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="edit-consumable"
                  type="checkbox"
                  checked={isConsumable}
                  onChange={e => setIsConsumable(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="edit-consumable" className="text-sm text-slate-700">
                  Расходуемый товар
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  className="flex-1 btn-secondary"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending || !name.trim() || quantity === '' || minQuantity === ''}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Delete confirmation overlay */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-xl flex items-center justify-center p-4">
            <div className="card p-6 w-full max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Удалить «{displayItem.name}»?</h3>
                  <p className="text-sm text-slate-500">Это действие нельзя отменить</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 btn-secondary"
                >
                  Отмена
                </button>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Chart component ---

function QuantityChart({ history, unit }: { history: QuantitySnapshot[]; unit: string }) {
  const labels = history.map(entry => {
    const date = new Date(entry.recorded_at)
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  })

  const typeLabels: Record<string, string> = {
    add: 'Пополнение',
    consume: 'Расход',
    update: 'Изменение',
    create: 'Создание',
  }

  const chartData = {
    labels,
    datasets: [
      {
        label: `Остаток (${unit})`,
        data: history.map(e => e.quantity),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: history.length > 20 ? 2 : 4,
        pointHoverRadius: 6,
        pointBackgroundColor: history.map(e => {
          if (e.change_type === 'add') return 'rgb(34, 197, 94)'
          if (e.change_type === 'consume') return 'rgb(239, 68, 68)'
          return 'rgb(99, 102, 241)'
        }),
        pointBorderColor: history.map(e => {
          if (e.change_type === 'add') return 'rgb(34, 197, 94)'
          if (e.change_type === 'consume') return 'rgb(239, 68, 68)'
          return 'rgb(99, 102, 241)'
        }),
        pointBorderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: { dataIndex: number }[]) => {
            if (items.length === 0) return ''
            const entry = history[items[0].dataIndex]
            return typeLabels[entry.change_type] || entry.change_type
          },
          label: (context: { parsed: { y: number | null } }) => {
            return `${context.parsed.y ?? 0} ${unit}`
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 6,
          font: { size: 10 },
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: { size: 10 },
          stepSize: 1,
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.15)',
        },
      },
    },
  }

  return (
    <div style={{ height: 180 }}>
      <Line data={chartData} options={options} />
    </div>
  )
}
