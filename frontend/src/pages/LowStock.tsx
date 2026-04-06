import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { itemsApi, Item } from '../api/items'
import ItemTable from '../components/ItemTable'
import ItemCardModal from '../components/ItemCardModal'

export default function LowStock() {
  const { id } = useParams<{ id: string }>()
  const spaceId = id ? parseInt(id) : null
  const queryClient = useQueryClient()

  const currentSpaceId = spaceId
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items', currentSpaceId],
    queryFn: () => (currentSpaceId ? itemsApi.getAll(currentSpaceId) : Promise.resolve([])),
    enabled: !!currentSpaceId,
  })

  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editQty, setEditQty] = useState<string>('0')

  const addMutation = useMutation({
    mutationFn: ({ id: itemId, qty }: { id: number; qty: number }) =>
      currentSpaceId ? itemsApi.add(currentSpaceId, itemId, qty) : Promise.reject(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items', currentSpaceId] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id: itemId, qty }: { id: number; qty: number }) =>
      currentSpaceId ? itemsApi.updateOne(currentSpaceId, itemId, qty) : Promise.reject(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items', currentSpaceId] })
      queryClient.invalidateQueries({ queryKey: ['itemHistory', currentSpaceId, variables.id] })
      setEditingId(null)
      setEditQty('0')
    },
  })

  const lowStockItems = useMemo(() => {
    let result = items.filter(i => i.quantity <= i.min_quantity)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(i =>
        i.name.toLowerCase().includes(s) ||
        (i.location && i.location.toLowerCase().includes(s))
      )
    }
    if (locationFilter) result = result.filter(i => i.location === locationFilter)
    return result.sort((a, b) => (a.quantity - a.min_quantity) - (b.quantity - b.min_quantity))
  }, [items, search, locationFilter])

  const renderActions = (item: typeof lowStockItems[0]) => {
    const isEditing = editingId === item.id
    if (isEditing) {
      return (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            inputMode="numeric"
            value={editQty}
            onChange={e => {
              const v = e.target.value
              if (v === '' || v === '-' || /^\d+$/.test(v)) {
                setEditQty(v)
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') updateMutation.mutate({ id: item.id, qty: editQty === '' ? 0 : Number(editQty) })
              if (e.key === 'Escape') { setEditingId(null); setEditQty('0') }
            }}
            className="w-20 px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            autoFocus
          />
          <button
            onClick={() => updateMutation.mutate({ id: item.id, qty: editQty === '' ? 0 : Number(editQty) })}
            disabled={editQty === ''}
            className="p-1.5 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={() => { setEditingId(null); setEditQty('0') }}
            className="p-1.5 text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => addMutation.mutate({ id: item.id, qty: 1 })}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          1
        </button>
        <button
          onClick={() => { setEditingId(item.id); setEditQty(String(item.min_quantity * 2)) }}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Задать
        </button>
      </div>
    )
  }

  if (isLoading) return <div className="text-center py-20 text-slate-400">Загрузка...</div>

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Заканчивается</h1>
          <p className="text-sm text-slate-500 mt-1">
            {lowStockItems.length} товар(ов) требуют внимания
          </p>
        </div>
      </div>

      <ItemTable
        items={lowStockItems}
        allItems={items}
        renderActions={renderActions}
        emptyMessage="Всё в наличии! Заканчивающихся товаров нет"
        search={search}
        onSearchChange={setSearch}
        locationFilter={locationFilter}
        onLocationFilterChange={setLocationFilter}
        locations={[]}
        onResetFilters={() => { setSearch(''); setLocationFilter('') }}
        hasFilters={!!search || !!locationFilter}
        onItemClick={setSelectedItem}
      />

      <ItemCardModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
        spaceId={currentSpaceId!}
      />
    </div>
  )
}
