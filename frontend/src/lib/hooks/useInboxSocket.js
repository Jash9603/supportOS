// -----------------------------------------------------------------------------
// lib/hooks/useInboxSocket.js — Real-time Inbox Updates Hook
// -----------------------------------------------------------------------------
//
// WHAT IS THIS?
// A custom React hook that connects to the agent inbox WebSocket.
// When a customer sends a message or a new ticket is created,
// this hook receives the event and tells the UI to refresh.
//
// HOW IT WORKS (layman terms):
//   Think of it like a walkie-talkie that's always on.
//   The kitchen (backend) shouts "New order!" into the walkie-talkie.
//   This hook is listening and says "Hey React, refresh the ticket list!"
//
// USAGE:
//   const { lastEvent } = useInboxSocket(orgId)
//   // lastEvent changes every time something happens → triggers re-fetch
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState, useCallback } from 'react'

export default function useInboxSocket(orgId) {
  const [lastEvent, setLastEvent] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)

  const connect = useCallback(() => {
    if (!orgId) return

    const wsUrl = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000')
    const ws = new WebSocket(`${wsUrl}/inbox-ws/${orgId}`)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[InboxSocket] Connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        // Every event from Redis gets forwarded here.
        // We just store it — the Inbox component reacts to changes.
        setLastEvent({ ...data, _ts: Date.now() })
      } catch (err) {
        console.error('[InboxSocket] Parse error:', err)
      }
    }

    ws.onclose = () => {
      console.log('[InboxSocket] Disconnected, reconnecting in 3s...')
      reconnectTimer.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => ws.close()
  }, [orgId])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { lastEvent }
}
