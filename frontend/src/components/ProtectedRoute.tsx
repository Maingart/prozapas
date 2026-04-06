import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSpaces } from '../context/SpacesContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const { spaces } = useSpaces()
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Загрузка...</div>
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  // Если нет пространств, редиректим на первое
  if (spaces.length === 0) {
    return <Navigate to="/space/1/items" replace />
  }
  
  return <>{children}</>
}
