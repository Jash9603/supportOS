// pages/widget/WidgetChat.jsx
// Customer-facing chat widget rendered inside an iframe.
// Connects to ws://backend/ws/{orgId}?session_id={sessionId}
// Handles message types: token, message, waiting, escalated, error

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'

function generateSessionId() {
  const stored = localStorage.getItem('sos_session')
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem('sos_session', id)
  return id
}

export default function WidgetChat() {
  const { orgId } = useParams()
  const [searchParams] = useSearchParams()
  const userId = searchParams.get('user_id') || 'default'

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [statusText, setStatusText] = useState(null)
  const wsRef = useRef(null)
  const messagesEndRef = useRef(null)
  const reconnectTimer = useRef(null)
  const sessionId = useRef(generateSessionId())
  const seenIds = useRef(new Set())        // Dedup guard: track message IDs we already rendered
  const cleanedUp = useRef(false)          // StrictMode guard: prevent double connection

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, statusText])

  // Load chat history
  useEffect(() => {
    async function loadHistory() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const res = await fetch(`${apiUrl}/widget/${orgId}/history?session_id=${sessionId.current}`)
        if (res.ok) {
          const data = await res.json()
          setMessages(data)
          data.forEach(msg => seenIds.current.add(msg.id))
        }
      } catch (e) {
        console.error("Failed to load history", e)
      }
    }
    loadHistory()
  }, [orgId])

  // WebSocket connection
  useEffect(() => {
    cleanedUp.current = false

    function connect() {
      // If cleanup already ran (StrictMode unmount), don't reconnect
      if (cleanedUp.current) return

      const wsUrl = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000')
      const ws = new WebSocket(`${wsUrl}/ws/${orgId}?session_id=${sessionId.current}&user_id=${encodeURIComponent(userId)}`)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        setStatusText(null)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'message': {
              // Dedup: skip if we've already rendered this message ID
              const msgId = data.id || ''
              if (msgId && seenIds.current.has(msgId)) break
              if (msgId) seenIds.current.add(msgId)

              setMessages(prev => [...prev, {
                id: msgId || Date.now(),
                body: data.body,
                sender: data.sender_type || 'agent',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }])
              setStatusText(null)
              break
            }

            case 'token':
              // Streaming bot token — append to last bot bubble or create one
              setMessages(prev => {
                const last = prev[prev.length - 1]
                if (last && last.sender === 'bot' && last.streaming) {
                  return [...prev.slice(0, -1), { ...last, body: last.body + data.content }]
                }
                return [...prev, {
                  id: Date.now(),
                  body: data.content,
                  sender: 'bot',
                  streaming: true,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                }]
              })
              setStatusText(null)
              break

            case 'waiting':
              setStatusText(data.message)
              break

            case 'error':
              setStatusText(data.message)
              break

            default:
              break
          }
        } catch (err) {
          console.error('Widget WS parse error:', err)
        }
      }

      ws.onclose = () => {
        setConnected(false)
        // Only reconnect if we haven't been cleaned up
        if (!cleanedUp.current) {
          reconnectTimer.current = setTimeout(connect, 2000)
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      cleanedUp.current = true              // Tell reconnect logic to stop
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [orgId])

  const sendMessage = () => {
    const trimmed = input.trim()
    if (!trimmed || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    // Optimistic local render
    setMessages(prev => [...prev, {
      id: Date.now(),
      body: trimmed,
      sender: 'customer',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }])

    wsRef.current.send(JSON.stringify({ body: trimmed }))
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={styles.container}>
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>Support<span style={{ color: '#F59E0B' }}>OS</span></span>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? '#22C55E' : '#EF4444',
            marginLeft: 8,
          }} />
        </div>
        <span style={styles.headerSubtext}>We typically reply instantly</span>
      </div>

      {/* ── Messages Area ───────────────────────────────────── */}
      <div style={styles.messagesArea}>
        {/* Welcome message */}
        {messages.length === 0 && !statusText && (
          <div style={styles.welcomeWrap}>
            <div style={styles.welcomeIcon}>💬</div>
            <p style={styles.welcomeTitle}>Hi there! 👋</p>
            <p style={styles.welcomeText}>How can we help you today?</p>
          </div>
        )}

        {messages.map((msg) => {
          const isCustomer = (msg.sender === 'customer' || msg.sender === 'user')
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isCustomer ? 'flex-end' : 'flex-start',
                marginBottom: 10,
                paddingLeft: isCustomer ? 40 : 0,
                paddingRight: isCustomer ? 0 : 40,
              }}
            >
              {/* Avatar for non-customer */}
              {!isCustomer && (
                <div style={styles.botAvatar}>
                  {msg.sender === 'bot' ? 'AI' : 'S'}
                </div>
              )}
              <div
                style={{
                  ...styles.bubble,
                  background: isCustomer ? '#0F172A' : '#F1F5F9',
                  color: isCustomer ? '#FFFFFF' : '#1E293B',
                  borderBottomRightRadius: isCustomer ? 4 : 16,
                  borderBottomLeftRadius: isCustomer ? 16 : 4,
                }}
              >
                {isCustomer ? (
                  <p style={styles.bubbleText}>{msg.body}</p>
                ) : (
                  <div className="widget-md">
                    <ReactMarkdown>{msg.body}</ReactMarkdown>
                  </div>
                )}
                <span style={{
                  ...styles.bubbleTime,
                  color: isCustomer ? 'rgba(255,255,255,0.5)' : '#94A3B8',
                }}>
                  {msg.time}
                </span>
              </div>
            </div>
          )
        })}

        {/* Typing indicator — engaging animation while AI thinks */}
        {statusText && (
          <div style={styles.typingWrap}>
            <div style={styles.botAvatar}>AI</div>
            <div style={styles.typingBubble}>
              <div style={styles.typingDots}>
                <span className="typing-dot" style={{ animationDelay: '0s' }} />
                <span className="typing-dot" style={{ animationDelay: '0.15s' }} />
                <span className="typing-dot" style={{ animationDelay: '0.3s' }} />
              </div>
              <span style={styles.typingLabel}>{statusText}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Bar ───────────────────────────────────────── */}
      <div style={styles.inputBar}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          style={styles.textarea}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          style={{
            ...styles.sendBtn,
            opacity: input.trim() ? 1 : 0.4,
          }}
        >
          ↑
        </button>
      </div>
      {/* CSS animations and markdown styles */}
      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
        .typing-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #6366F1; display: inline-block;
          animation: dotPulse 1.2s ease-in-out infinite;
        }
        /* Markdown formatting inside bot bubbles */
        .widget-md { font-size: 0.85rem; line-height: 1.6; word-break: break-word; }
        .widget-md p { margin: 0 0 8px 0; }
        .widget-md p:last-child { margin-bottom: 0; }
        .widget-md ul, .widget-md ol { margin: 4px 0 8px 0; padding-left: 18px; }
        .widget-md li { margin-bottom: 2px; }
        .widget-md strong { font-weight: 600; }
        .widget-md code { background: #E2E8F0; padding: 1px 4px; border-radius: 3px; font-size: 0.8em; }
        .widget-md h1, .widget-md h2, .widget-md h3 { font-size: 0.9rem; font-weight: 700; margin: 8px 0 4px; }
      `}</style>
    </div>
  )
}

// ── Inline styles ─────────────────────────────────────────────
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100%',
    fontFamily: 'Inter, system-ui, sans-serif',
    background: '#FFFFFF',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 20px',
    background: '#0F172A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 800,
    fontSize: '1rem',
    color: '#FFFFFF',
    letterSpacing: '-0.02em',
  },
  headerSubtext: {
    fontSize: '0.7rem',
    color: '#94A3B8',
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 16px',
  },
  welcomeWrap: {
    textAlign: 'center',
    marginTop: 40,
  },
  welcomeIcon: {
    fontSize: '2.5rem',
    marginBottom: 8,
  },
  welcomeTitle: {
    fontWeight: 700,
    fontSize: '1.1rem',
    color: '#0F172A',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: '0.85rem',
    color: '#64748B',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#F1F5F9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    marginRight: 8,
    flexShrink: 0,
    marginTop: 2,
  },
  bubble: {
    padding: '10px 14px',
    borderRadius: 16,
    maxWidth: '100%',
  },
  bubbleText: {
    margin: 0,
    fontSize: '0.85rem',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  bubbleTime: {
    display: 'block',
    fontSize: '0.62rem',
    marginTop: 4,
    textAlign: 'right',
  },
  typingWrap: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '8px 0',
    marginBottom: 10,
  },
  typingBubble: {
    background: '#F1F5F9',
    borderRadius: '16px 16px 16px 4px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  typingDots: {
    display: 'flex',
    gap: 4,
    justifyContent: 'center',
  },
  typingLabel: {
    fontSize: '0.72rem',
    color: '#6366F1',
    fontWeight: 500,
  },
  inputBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    borderTop: '1px solid #E2E8F0',
    background: '#FFFFFF',
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    resize: 'none',
    border: '1px solid #E2E8F0',
    borderRadius: 20,
    padding: '10px 16px',
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.85rem',
    outline: 'none',
    lineHeight: 1.4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    background: '#0F172A',
    color: '#FFFFFF',
    fontSize: '1.1rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'opacity 0.2s',
  },
}
