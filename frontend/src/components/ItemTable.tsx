import { useMemo } from 'react'
import { Item } from '../api/items'
import Select from './Select'

interface ItemTableProps {
  items: Item[]
  allItems?: Item[]
  renderActions: (item: Item) => React.ReactNode
  emptyMessage?: string
  search?: string
  onSearchChange?: (value: string) => void
  locationFilter?: string
  onLocationFilterChange?: (value: string) => void
  locations: string[]
  onResetFilters?: () => void
  hasFilters: boolean
  onItemClick?: (item: Item) => void
}

export default function ItemTable({
  items,
  allItems,
  renderActions,
  emptyMessage = 'Ничего не найдено',
  search,
  onSearchChange,
  locationFilter,
  onLocationFilterChange,
  locations,
  onResetFilters,
  hasFilters,
  onItemClick,
}: ItemTableProps) {
  // Always compute locations from allItems if provided, otherwise from items
  const itemsForLocations = allItems ?? items
  const locationsList = useMemo(
    () => {
      if (locations.length > 0) return locations
      return [...new Set(itemsForLocations.map(i => i.location).filter((l): l is string => !!l))].sort()
    },
    [itemsForLocations, locations],
  )

  return (
    <>
      {/* Search & Filters */}
      <div className="card p-3 mb-6">
        <div className="flex flex-col lg:flex-row gap-2">
          {onSearchChange && (
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Поиск по названию или месту..."
                value={search || ''}
                onChange={e => onSearchChange(e.target.value)}
                className="input-field pl-10 text-sm"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {onLocationFilterChange && (
              <Select
                value={locationFilter || ''}
                onChange={onLocationFilterChange}
                options={locationsList.map(l => ({ value: l, label: l }))}
                placeholder="Все места"
                className="w-44"
              />
            )}
            {hasFilters && onResetFilters && (
              <button
                onClick={onResetFilters}
                className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                Сбросить
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Название</th>
              <th className="text-left py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Место</th>
              <th className="text-left py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">Кол-во</th>
              <th className="text-left py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-44">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-16">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="text-slate-500 font-medium">{emptyMessage}</p>
                    <p className="text-slate-400 text-sm mt-1">Попробуйте изменить фильтры</p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map(item => {
                const isLow = item.quantity <= item.min_quantity
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onItemClick?.(item)}
                          className="font-medium text-slate-900 hover:text-indigo-600 transition-colors text-left"
                        >
                          {item.name}
                        </button>
                        {isLow && <span className="badge-red">мало</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 align-middle hidden lg:table-cell">{item.location || '—'}</td>
                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1">
                            <span className={`font-mono font-semibold ${isLow ? 'text-red-600' : 'text-slate-900'}`}>
                              {item.quantity}
                            </span>
                            <span className="text-slate-400 text-xs">{item.unit}</span>
                            <span className="text-slate-400 text-xs">/ {item.min_quantity}</span>
                          </div>
                          <div className="mt-1 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isLow ? 'bg-red-500' : item.quantity <= item.min_quantity * 1.5 ? 'bg-amber-400' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, item.min_quantity > 0 ? (item.quantity / (item.min_quantity * 2)) * 100 : 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      {renderActions(item)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {items.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center text-slate-400">
            <p>{emptyMessage}</p>
          </div>
        ) : (
          items.map(item => {
            const isLow = item.quantity <= item.min_quantity
            return (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onItemClick?.(item)}
                        className="font-medium text-slate-900 hover:text-indigo-600 transition-colors truncate text-left"
                      >
                        {item.name}
                      </button>
                      {isLow && <span className="badge-red shrink-0">мало</span>}
                    </div>
                    <div className="mt-1.5 text-sm text-slate-500">
                      {item.location || '—'}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="flex items-baseline gap-1">
                      <span className={`font-mono font-bold text-xl ${isLow ? 'text-red-600' : 'text-slate-900'}`}>
                        {item.quantity}
                      </span>
                      <span className="text-slate-400 text-sm ml-0.5">{item.unit}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">/ {item.min_quantity}</div>
                    <div className="mt-1.5 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isLow ? 'bg-red-500' : item.quantity <= item.min_quantity * 1.5 ? 'bg-amber-400' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, item.min_quantity > 0 ? (item.quantity / (item.min_quantity * 2)) * 100 : 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                {renderActions(item)}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
