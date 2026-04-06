import { createContext, useContext, ReactNode } from 'react'
import { User } from '../api/items'
import { useToken, useCurrentUser } from './useToken'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { token, login, register, logout } = useToken()
  const { user, isLoading } = useCurrentUser(token)

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        token,
        login,
        register,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
