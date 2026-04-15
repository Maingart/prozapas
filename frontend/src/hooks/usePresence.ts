import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export interface OnlineUser {
  user_id: number
  email: string
}

export interface PresenceMessage {
  event: 'join' | 'leave' | 'init' | 'pong' | 'item_created' | 'item_updated' | 'item_deleted'
  user_id?: number
  email?: string
  online_users: OnlineUser[]
  id?: number
  name?: string
  quantity?: number
  unit?: string
  min_quantity?: number
  location?: string | null
  is_consumable?: boolean
  space_id?: number | null
  created_at?: string
  updated_at?: string
  bulk?: boolean
  items?: Array<{ id: number; quantity: number }>
}

interface UsePresenceOptions {
  spaceId: number | null
  enabled?: boolean
}

/**
 * WebSocket-based presence hook for real-time user tracking.
 * 
 * Connects to the WebSocket endpoint when a space is selected,
 * and maintains a list of currently online users in that space.
 * 
 * @example
 * ```tsx
 * const { onlineUsers, isConnected } = usePresence({ spaceId: 123 })
 * ```
 */
export function usePresence({ spaceId, enabled = true }: UsePresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const heartbeatIntervalRef = useRef<number | null>(null)
  const queryClient = useQueryClient()

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null // Don't trigger reconnect on manual close
      wsRef.current.close()
      wsRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
    setIsConnected(false)
  }, [])

  const connect = useCallback(() => {
    if (!spaceId || !enabled) {
      cleanup()
      setOnlineUsers([])
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      console.warn('[Presence] No auth token found')
      return
    }

    cleanup()

    // Build WebSocket URL - use same host/port as page in dev (Vite proxy)
    // In production, WebSocket is on the same server as API
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = window.location.port || '80'
    const wsUrl = `${protocol}//${host}:${port}/ws/spaces/${spaceId}?token=${encodeURIComponent(token)}`

    console.log(`[Presence] Connecting to ${wsUrl}`)

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[Presence] Connected')
      setIsConnected(true)

      // Start heartbeat every 30 seconds
      heartbeatIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30000)
    }

    ws.onmessage = (event) => {
      try {
        const message: PresenceMessage = JSON.parse(event.data)
        console.log('[Presence] Received:', message.event, message)

        switch (message.event) {
          case 'init':
          case 'join':
          case 'leave':
            setOnlineUsers([...message.online_users].sort((a, b) => a.email.localeCompare(b.email)))
            break
          
          case 'item_created':
          case 'item_updated':
            // Invalidate items list to refetch fresh data
            queryClient.invalidateQueries({ queryKey: ['items', spaceId] })
            // Also invalidate the specific item if it was updated
            if (message.id) {
              queryClient.invalidateQueries({ queryKey: ['item', spaceId, message.id] })
              queryClient.invalidateQueries({ queryKey: ['itemHistory', spaceId, message.id] })
            }
            // Handle bulk updates
            if (message.bulk && message.items) {
              message.items.forEach(item => {
                queryClient.invalidateQueries({ queryKey: ['item', spaceId, item.id] })
                queryClient.invalidateQueries({ queryKey: ['itemHistory', spaceId, item.id] })
              })
            }
            break
          
          case 'item_deleted':
            if (message.id) {
              queryClient.invalidateQueries({ queryKey: ['items', spaceId] })
              queryClient.removeQueries({ queryKey: ['item', spaceId, message.id] })
              queryClient.removeQueries({ queryKey: ['itemHistory', spaceId, message.id] })
            }
            break
          
          case 'pong':
            // Server heartbeat, connection is alive
            break
          
          default:
            console.warn('[Presence] Unknown event:', message.event)
        }
      } catch (error) {
        console.error('[Presence] Failed to parse message:', error)
      }
    }

    ws.onclose = (event) => {
      console.log('[Presence] Disconnected:', event.code, event.reason)
      setIsConnected(false)
      setOnlineUsers([])

      // Reconnect after 3 seconds (unless manual close)
      if (event.code !== 1000) {
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect()
        }, 3000)
      }
    }

    ws.onerror = (error) => {
      console.error('[Presence] WebSocket error:', error)
    }
  }, [spaceId, enabled, cleanup, queryClient])

  // Connect/disconnect on space change
  useEffect(() => {
    connect()
    return cleanup
  }, [connect, cleanup])

  return { onlineUsers, isConnected }
}
