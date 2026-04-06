import { createContext, useContext, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { spacesApi, Space } from '../api/items'
import { useActiveSpace } from './useActiveSpace'

interface SpacesContextType {
  spaces: Space[]
  activeSpace: Space | null
  isLoading: boolean
}

const SpacesContext = createContext<SpacesContextType | null>(null)

export function SpacesProvider({ children }: { children: ReactNode }) {
  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ['spaces'],
    queryFn: spacesApi.list,
    retry: false,
  })

  const { activeSpace } = useActiveSpace(spaces)

  return (
    <SpacesContext.Provider value={{ spaces, activeSpace, isLoading }}>
      {children}
    </SpacesContext.Provider>
  )
}

export function useSpaces() {
  const ctx = useContext(SpacesContext)
  if (!ctx) throw new Error('useSpaces must be used inside SpacesProvider')
  return ctx
}
