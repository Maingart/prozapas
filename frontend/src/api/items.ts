import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Interceptor для добавления токена
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else if (import.meta.env.DEV) {
    console.warn('[API] No token in localStorage for', config.url)
  }
  return config
})

// Interceptor для логирования ошибок (dev)
api.interceptors.response.use(
  r => r,
  error => {
    if (import.meta.env.DEV) {
      console.error(`[API] ${error.response?.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.response?.data)
    }
    return Promise.reject(error)
  },
)

// --- Types ---

export interface User {
  id: number
  email: string
}

export interface Space {
  id: number
  name: string
  description: string | null
  created_at: string
  role?: string
}

export interface SpaceDetail extends Space {
  members: { id: number; email: string; role: string }[]
  item_count: number
}

export interface Item {
  id: number
  name: string
  quantity: number
  unit: string
  min_quantity: number
  location: string | null
  is_consumable: boolean
  space_id: number | null
  created_at: string
  updated_at: string
}

export interface BulkUpdatePayload {
  id: number
  quantity: number
}

export interface QuantitySnapshot {
  id: number
  quantity: number
  change_type: string
  recorded_at: string
}

// --- Auth ---

export const authApi = {
  register: (email: string, password: string) =>
    api.post<User>('/auth/register', { email, password }).then(r => r.data),

  login: (email: string, password: string) =>
    api.post<{ access_token: string; token_type: string }>('/auth/login', { email, password }).then(r => r.data),

  me: () => api.get<User>('/auth/me').then(r => r.data),
}

// --- Spaces ---

export const spacesApi = {
  list: () => api.get<Space[]>('/spaces').then(r => r.data),

  create: (name: string, description?: string) =>
    api.post<Space>('/spaces', { name, description }).then(r => r.data),

  getDetail: (id: number) => api.get<SpaceDetail>(`/spaces/${id}`).then(r => r.data),

  deleteSpace: (id: number) => api.delete(`/spaces/${id}`),

  createInvite: (spaceId: number) =>
    api.post<{ token: string; space_name: string; expires_at: string }>(`/spaces/${spaceId}/invites`).then(r => r.data),

  acceptInvite: (token: string) =>
    api.get<{ space_id: number; space_name: string; message: string }>(`/invites/${token}`).then(r => r.data),

  removeMember: (spaceId: number, userId: number) =>
    api.delete<{ message: string; user_id: number }>(`/spaces/${spaceId}/members/${userId}`).then(r => r.data),

  leaveSpace: (spaceId: number) =>
    api.delete<{ message: string; space_id: number }>(`/spaces/${spaceId}/leave`).then(r => r.data),
}

// --- Items ---

export const itemsApi = {
  getAll: (spaceId: number) => api.get<Item[]>(`/spaces/${spaceId}/items`).then(r => r.data),

  create: (spaceId: number, data: { name: string; quantity?: number; unit?: string; min_quantity?: number; location?: string; is_consumable?: boolean }) =>
    api.post<Item>(`/spaces/${spaceId}/items`, data).then(r => r.data),

  getOne: (spaceId: number, id: number) =>
    api.get<Item>(`/spaces/${spaceId}/items/${id}`).then(r => r.data),

  update: (spaceId: number, id: number, data: { name?: string; quantity?: number; unit?: string; min_quantity?: number; location?: string; is_consumable?: boolean }) =>
    api.put<Item>(`/spaces/${spaceId}/items/${id}`, data).then(r => r.data),

  delete: (spaceId: number, id: number) =>
    api.delete<Item>(`/spaces/${spaceId}/items/${id}`).then(r => r.data),

  updateOne: (spaceId: number, id: number, quantity: number) =>
    api.put<Item>(`/spaces/${spaceId}/items/${id}`, { quantity }).then(r => r.data),

  updateBulk: (spaceId: number, updates: BulkUpdatePayload[]) =>
    api.patch<Item[]>(`/spaces/${spaceId}/items/bulk`, updates).then(r => r.data),

  add: (spaceId: number, id: number, quantity: number = 1) =>
    api.post<Item>(`/spaces/${spaceId}/items/${id}/add`, { quantity }).then(r => r.data),

  consume: (spaceId: number, id: number, quantity: number = 1) =>
    api.post<Item>(`/spaces/${spaceId}/items/${id}/consume`, { quantity }).then(r => r.data),

  getHistory: (spaceId: number, id: number) =>
    api.get<QuantitySnapshot[]>(`/spaces/${spaceId}/items/${id}/history`).then(r => r.data),
}
