import { Space } from '../api/items'

export function useActiveSpace(spaces: Space[]) {
  const activeSpace = spaces[0] ?? null
  return { activeSpace }
}
