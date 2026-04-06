import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useSpaces } from './context/SpacesContext'
import ProtectedRoute from './components/ProtectedRoute'
import SpaceLayout from './components/SpaceLayout'
import EmptyState from './components/EmptyState'
import Login from './pages/Login'
import Register from './pages/Register'
import Items from './pages/Items'
import LowStock from './pages/LowStock'
import SpaceSettings from './pages/SpaceSettings'
import AcceptInvite from './pages/AcceptInvite'

function AppContent() {
  const { user } = useAuth()
  const { spaces, isLoading: spacesLoading } = useSpaces()
  const location = useLocation()
  const isInviteRoute = location.pathname.startsWith('/invite/')

  // Если не авторизован — показываем логин или приглашение
  if (!user) {
    return (
      <Routes>
        <Route path="/invite/:token" element={<AcceptInvite />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  // Пока грузятся пространства — показываем загрузку
  if (spacesLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400">Загрузка...</div>
      </div>
    )
  }

  // Если нет пространств и это не приглашение — показываем empty state
  if (spaces.length === 0 && !isInviteRoute) {
    return <EmptyState />
  }

  // Авторизованный пользователь — основной интерфейс с sidebar
  return (
    <Routes>
      {/* Invite доступен и авторизованным */}
      <Route path="/invite/:token" element={<AcceptInvite />} />

      {/* Пространства */}
      <Route
        element={
          <ProtectedRoute>
            <SpaceLayout />
          </ProtectedRoute>
        }
      >
        {/* Редирект на первое пространство */}
        <Route
          path="/"
          element={<Navigate to={`/space/${spaces[0]?.id}/items`} replace />}
        />
        <Route
          path="/space/:id/items"
          element={<Items />}
        />
        <Route
          path="/space/:id/low-stock"
          element={<LowStock />}
        />
        <Route
          path="/space/:id/settings"
          element={<SpaceSettings />}
        />
      </Route>
    </Routes>
  )
}

export default function App() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400">Загрузка...</div>
      </div>
    )
  }

  return <AppContent />
}
