import { Outlet, useParams, Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useSpaces } from '../context/SpacesContext'
import { usePresence } from '../hooks/usePresence'
import Sidebar from './Sidebar'
import AddItemModal from './AddItemModal'
import AddSpaceModal from './AddSpaceModal'

export default function SpaceLayout() {
  const { id } = useParams<{ id: string }>()
  const spaceId = id ? parseInt(id) : null
  const location = useLocation()
  const { spaces } = useSpaces()
  const { onlineUsers } = usePresence({ spaceId })
  const [showAddItem, setShowAddItem] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAddSpace, setShowAddSpace] = useState(false)

  if (spaces.length === 0) {
    return null
  }

  // Определяем текущую вкладку
  const activeTab = location.pathname.includes('/low-stock') ? 'low-stock' : 'items'
  const baseUrl = `/space/${spaceId || spaces[0].id}`
  const currentSpaceId = spaceId || spaces[0].id

  const tabClass = (tab: string) => {
    return activeTab === tab
      ? 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg'
      : 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors'
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, visible on lg+ */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:static lg:z-auto lg:shrink-0
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} onAddSpace={() => setShowAddSpace(true)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar with tabs */}
        <div className="bg-white border-b border-slate-200 px-4 h-16 flex items-center sm:px-6">
          {/* Hamburger button — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors shrink-0 mr-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <Link
              to={`${baseUrl}/items`}
              className={tabClass('items')}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="hidden sm:inline">Все товары</span>
            </Link>
            <Link
              to={`${baseUrl}/low-stock`}
              className={tabClass('low-stock')}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="hidden sm:inline">Заканчивается</span>
            </Link>
          </div>

          <div className="flex-1 flex justify-end ml-auto">
            {/* Online users */}
            {onlineUsers.length > 0 && (
              <div className="hidden sm:flex items-center gap-1 mr-3">
                <div className="flex -space-x-2">
                  {onlineUsers.slice(0, 5).map(user => (
                    <div
                      key={user.user_id}
                      className="relative group"
                      title={user.email}
                    >
                      <div className="relative w-8 h-8">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center">
                          <span className="text-xs font-semibold text-indigo-700">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      {/* Tooltip */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block z-50">
                        <div className="px-2 py-1 text-xs font-medium text-white bg-slate-900 rounded whitespace-nowrap shadow-lg">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  ))}
                  {onlineUsers.length > 5 && (
                    <div className="relative w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center">
                      <span className="text-xs font-semibold text-slate-600">
                        +{onlineUsers.length - 5}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowAddItem(true)}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Добавить товар</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </div>
      </div>

      <AddItemModal
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        spaceId={currentSpaceId}
      />

      <AddSpaceModal
        isOpen={showAddSpace}
        onClose={() => setShowAddSpace(false)}
      />
    </div>
  )
}
