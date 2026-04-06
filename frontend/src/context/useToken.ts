import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, User } from '../api/items'

export function useToken() {
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))

  const setStoredToken = useCallback((newToken: string | null) => {
    setToken(newToken)
    if (newToken) {
      localStorage.setItem('token', newToken)
    } else {
      localStorage.removeItem('token')
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password)
    setStoredToken(data.access_token)
    queryClient.invalidateQueries({ queryKey: ['me'] })
    queryClient.invalidateQueries({ queryKey: ['spaces'] })
  }, [setStoredToken, queryClient])

  const register = useCallback(async (email: string, password: string) => {
    await authApi.register(email, password)
    await login(email, password)
  }, [login])

  const logout = useCallback(() => {
    setStoredToken(null)
    queryClient.clear()
  }, [setStoredToken, queryClient])

  return { token, setToken: setStoredToken, login, register, logout }
}

export function useCurrentUser(token: string | null) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    enabled: !!token,
    retry: false,
  })
  return { user: user as User | null, isLoading }
}
