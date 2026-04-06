import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSpaces } from '../context/SpacesContext'

interface SidebarProps {
  onClose?: () => void
  onAddSpace?: () => void
}

export default function Sidebar({ onClose, onAddSpace }: SidebarProps) {
  const { user, logout } = useAuth()
  const { spaces } = useSpaces()
  const navigate = useNavigate()
  const location = useLocation()
  const currentSpaceId = parseInt(location.pathname.split('/')[2] || '0')

  const handleNavigate = (spaceId: number) => {
    navigate(`/space/${spaceId}/items`)
    onClose?.()
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64 shrink-0">
      {/* Logo */}
      <div className="px-4 h-16 flex items-center border-b border-slate-200">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <span className="text-lg font-bold text-slate-900">Про запас</span>
        </Link>
      </div>

      {/* Spaces list */}
      <div className="flex-1 px-3 py-4 overflow-y-auto">
        <nav className="space-y-1">
          {spaces.map(space => (
            <div key={space.id}>
              <button
                onClick={() => handleNavigate(space.id)}
                className={`w-full ${
                  currentSpaceId === space.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                } flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors`}
              >
                <span className="truncate">{space.name}</span>
                <Link
                  to={`/space/${space.id}/settings`}
                  className="ml-auto p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
                  title="Настройки"
                  onClick={e => { e.stopPropagation(); onClose?.() }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>
              </button>
            </div>
          ))}
          {/* Add space button */}
          <button
            onClick={() => onAddSpace?.()}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors mt-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить пространство
          </button>
        </nav>
      </div>

      {/* User footer */}
      {user && (
        <div className="px-3 py-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-medium text-indigo-700">
                {user.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { logout(); onClose?.() }}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Выйти"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
