// -----------------------------------------------------------------------------
// dashboard/inbox/Inbox.jsx — 3-Panel Inbox Screen
// -----------------------------------------------------------------------------
//
// LAYOUT:
// ┌──────────────┬────────────────────┬─────────────────────────────────┐
// │  Filters     │   Ticket List      │   Ticket Detail                 │
// │  (200px)     │   (320px)          │   (flex-1)                      │
// │              │                    │                                 │
// │  ○ All Open  │  [ticket rows]     │   Subject + Status              │
// │  ○ Mine      │  bold = unread     │   Message thread                │
// │  ○ Resolved  │  click to select   │   [Reply textarea] [Send]       │
// │              │                    │                                 │
// │  [Search]    │                    │                                 │
// └──────────────┴────────────────────┴─────────────────────────────────┘
//
// DATA FLOW:
//   1. On mount → fetch GET /tickets from API
//   2. useInboxSocket listens for real-time events
//   3. When an event fires → re-fetch ticket list
//   4. Clicking a ticket → fetch GET /tickets/{id} (with messages)
//   5. Sending a reply → POST /tickets/{id}/messages
// -----------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import useInboxSocket from '../../lib/hooks/useInboxSocket'

export default function Inbox({ user }) {
  // ── State ─────────────────────────────────────────────────────────────
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [replyText, setReplyText] = useState('')
  const [filter, setFilter] = useState('open')     // open | mine | resolved
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  // Real-time hook — fires whenever a new ticket/message event comes in
  const { lastEvent } = useInboxSocket(user?.org_id)

  // ── Fetch ticket list ─────────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    try {
      const params = {}
      if (filter === 'open') params.status = 'open'
      if (filter === 'resolved') params.status = 'resolved'
      if (filter === 'mine') params.assigned_to = user?.id

      const res = await api.get('/tickets', { params })
      setTickets(res.data)
    } catch (err) {
      console.error('Failed to fetch tickets:', err)
    } finally {
      setLoading(false)
    }
  }, [filter, user])

  // Fetch on mount + when filter changes
  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  // Re-fetch when a real-time event fires (new ticket, new message, etc.)
  useEffect(() => {
    if (lastEvent) {
      fetchTickets()
      // If we're viewing a ticket that got a new message, refresh it too
      if (selectedTicket && lastEvent.ticket_id === String(selectedTicket.id)) {
        fetchTicketDetail(selectedTicket.id)
      }
    }
  }, [lastEvent]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch single ticket (with messages) ───────────────────────────────
  const fetchTicketDetail = async (ticketId) => {
    try {
      const res = await api.get(`/tickets/${ticketId}`)
      setSelectedTicket({ ...res.data })
      // Make sure messages have string IDs for the mapped key and deduplication
      const msgs = (res.data.messages || []).map(m => ({
        ...m,
        id: String(m.id)
      }))
      setMessages(msgs)
    } catch (err) {
      console.error('Failed to fetch ticket detail:', err)
    }
  }

  // ── Send agent reply ──────────────────────────────────────────────────
  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket || sending) return
    setSending(true)
    try {
      await api.post(`/tickets/${selectedTicket.id}/messages`, {
        body: replyText.trim(),
      })
      setReplyText('')
      // Refresh the thread
      await fetchTicketDetail(selectedTicket.id)
      fetchTickets()
    } catch (err) {
      console.error('Failed to send reply:', err)
    } finally {
      setSending(false)
    }
  }

  // ── Resolve & Send ────────────────────────────────────────────────────
  const handleResolveAndSend = async () => {
    if (!replyText.trim() || !selectedTicket || sending) return
    setSending(true)
    try {
      // Send the message first
      await api.post(`/tickets/${selectedTicket.id}/messages`, {
        body: replyText.trim(),
      })
      // Then update status to resolved
      await api.patch(`/tickets/${selectedTicket.id}`, {
        status: 'resolved',
      })
      setReplyText('')
      await fetchTicketDetail(selectedTicket.id)
      fetchTickets()
    } catch (err) {
      console.error('Failed to resolve:', err)
    } finally {
      setSending(false)
    }
  }

  // ── Filter tickets by search query (client-side) ──────────────────────
  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      t.subject?.toLowerCase().includes(q) ||
      t.requester_name?.toLowerCase().includes(q) ||
      t.requester_email?.toLowerCase().includes(q)
    )
  })

  // ── Time ago helper ───────────────────────────────────────────────────
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div style={styles.container}>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PANEL 1: Filters (200px)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={styles.filterPanel}>
        <h3 style={styles.filterTitle}>Views</h3>

        {[
          { key: 'open', label: 'All Open', count: tickets.filter(t => t.status === 'open').length },
          { key: 'mine', label: 'Assigned to me', count: tickets.filter(t => String(t.assigned_to) === String(user?.id)).length },
          { key: 'resolved', label: 'Resolved', count: null },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              ...styles.filterBtn,
              background: filter === f.key ? '#EEF2FF' : 'transparent',
              color: filter === f.key ? '#4F46E5' : '#475569',
              fontWeight: filter === f.key ? 600 : 400,
            }}
          >
            <span>{f.label}</span>
            {f.count !== null && (
              <span style={{
                ...styles.countBadge,
                background: filter === f.key ? '#4F46E5' : '#CBD5E1',
                color: filter === f.key ? '#FFFFFF' : '#475569',
              }}>{f.count}</span>
            )}
          </button>
        ))}

        {/* Search */}
        <div style={{ marginTop: 20 }}>
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PANEL 2: Ticket List (320px)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={styles.listPanel}>
        {loading ? (
          <div style={styles.emptyState}>Loading...</div>
        ) : filteredTickets.length === 0 ? (
          <div style={styles.emptyState}>No tickets found</div>
        ) : (
          filteredTickets.map((ticket) => {
            const isActive = selectedTicket?.id === ticket.id
            const isUnread = ticket.status === 'open'
            return (
              <div
                key={ticket.id}
                onClick={() => fetchTicketDetail(ticket.id)}
                style={{
                  ...styles.ticketRow,
                  background: isActive ? '#F8FAFC' : '#FFFFFF',
                  borderLeft: isActive ? '3px solid #6366F1' : '3px solid transparent',
                }}
              >
                {/* Channel icon */}
                <span style={styles.channelIcon}>
                  {ticket.channel === 'email' ? 'E' : 'C'}
                </span>

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  {/* Subject (bold if open/unread) */}
                  <div style={{
                    ...styles.ticketSubject,
                    fontWeight: isUnread ? 600 : 400,
                  }}>
                    {ticket.subject}
                  </div>
                  {/* Requester + time */}
                  <div style={styles.ticketMeta}>
                    {ticket.requester_name} · {timeAgo(ticket.created_at)}
                  </div>
                </div>

                {/* Status dot */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: ticket.status === 'resolved' ? '#22C55E'
                    : ticket.status === 'open' ? '#F59E0B' : '#94A3B8',
                  flexShrink: 0,
                }} />
              </div>
            )
          })
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PANEL 3: Ticket Detail (flex-1)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={styles.detailPanel}>
        {!selectedTicket ? (
          <div style={styles.emptyDetail}>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#94A3B8' }}>Inbox</span>
            <p style={{ color: '#94A3B8', marginTop: 12 }}>Select a ticket to view the conversation</p>
          </div>
        ) : (
          <>
            {/* ── Detail Header ──────────────────────────────── */}
            <div style={styles.detailHeader}>
              <div>
                <h2 style={styles.detailSubject}>{selectedTicket.subject}</h2>
                <div style={styles.detailMeta}>
                  {selectedTicket.requester_name} · {selectedTicket.requester_email} ·{' '}
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: selectedTicket.status === 'resolved' ? '#DCFCE7' : '#FEF3C7',
                    color: selectedTicket.status === 'resolved' ? '#166534' : '#92400E',
                  }}>
                    {selectedTicket.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Message Thread ──────────────────────────────── */}
            <div style={styles.threadArea}>
              {messages.length === 0 ? (
                <div style={styles.emptyState}>No messages yet</div>
              ) : (
                messages.map((msg) => {
                  const isAgent = msg.sender_type === 'agent'
                  const isBot = msg.sender_type === 'bot'
                  const isAgentOrBot = (isAgent || isBot)
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: isAgentOrBot ? 'flex-end' : 'flex-start',
                        marginBottom: 14,
                      }}
                    >
                      {/* Avatar for customer/user (Left Side) */}
                      {!isAgentOrBot && (
                        <div style={{
                          ...styles.msgAvatar,
                          background: '#F1F5F9', color: '#1E293B',
                        }}>
                          {msg.sender_type === 'user' ? 'U' : '?'}
                        </div>
                      )}

                      <div style={{
                        maxWidth: '65%',
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: isAgentOrBot ? '#0F172A' : '#F1F5F9',
                        color: isAgentOrBot ? '#FFFFFF' : '#1E293B',
                        borderBottomRightRadius: isAgentOrBot ? 4 : 12,
                        borderBottomLeftRadius: isAgentOrBot ? 12 : 4,
                      }}>
                        <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5 }}>{msg.body}</p>
                        <span style={{
                          display: 'block', fontSize: '0.65rem', marginTop: 4,
                          color: isAgentOrBot ? 'rgba(255,255,255,0.5)' : '#94A3B8',
                          textAlign: isAgentOrBot ? 'right' : 'left',
                        }}>
                          {isBot ? 'Support AI' : isAgent ? 'You' : selectedTicket.requester_name}
                          {' · '}
                          {timeAgo(msg.created_at)}
                        </span>
                      </div>

                      {/* Avatar for agent or bot (Right Side) */}
                      {isAgentOrBot && (
                        <div style={{
                          ...styles.msgAvatar,
                          background: isBot ? '#334155' : '#6366F1', 
                          color: '#FFF', 
                          marginLeft: 8, 
                          marginRight: 0,
                          fontSize: isBot ? '0.6rem' : '0.8rem',
                          fontWeight: isBot ? 800 : 600,
                        }}>
                          {isBot ? 'AI' : (user?.name || 'A').charAt(0)}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* ── Reply Editor ────────────────────────────────── */}
            {selectedTicket.status !== 'resolved' && (
              <div style={styles.replyBar}>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  rows={2}
                  style={styles.replyTextarea}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendReply()
                    }
                  }}
                />
                <div style={styles.replyActions}>
                  <button
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || sending}
                    style={{
                      ...styles.sendBtn,
                      opacity: replyText.trim() && !sending ? 1 : 0.4,
                    }}
                  >
                    Send
                  </button>
                  <button
                    onClick={handleResolveAndSend}
                    disabled={!replyText.trim() || sending}
                    style={{
                      ...styles.resolveBtn,
                      opacity: replyText.trim() && !sending ? 1 : 0.4,
                    }}
                  >
                    Resolve & Send
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  container: {
    display: 'flex',
    height: '100%',
    fontFamily: 'Inter, system-ui, sans-serif',
  },

  // Panel 1: Filters
  filterPanel: {
    width: 200,
    padding: '20px 12px',
    borderRight: '1px solid #E2E8F0',
    background: '#FFFFFF',
    flexShrink: 0,
  },
  filterTitle: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
    padding: '0 8px',
  },
  filterBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '8px 10px',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.84rem',
    textAlign: 'left',
    transition: 'all 0.15s',
    fontFamily: 'Inter, sans-serif',
    marginBottom: 2,
  },
  countBadge: {
    fontSize: '0.68rem',
    fontWeight: 700,
    padding: '1px 7px',
    borderRadius: 10,
  },
  searchInput: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #E2E8F0',
    borderRadius: 6,
    fontSize: '0.82rem',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
  },

  // Panel 2: Ticket List
  listPanel: {
    width: 320,
    borderRight: '1px solid #E2E8F0',
    background: '#FFFFFF',
    overflowY: 'auto',
    flexShrink: 0,
  },
  ticketRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid #F1F5F9',
    transition: 'background 0.1s',
  },
  channelIcon: {
    fontSize: '1rem',
    flexShrink: 0,
  },
  ticketSubject: {
    fontSize: '0.84rem',
    color: '#0F172A',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: 2,
  },
  ticketMeta: {
    fontSize: '0.72rem',
    color: '#94A3B8',
  },

  // Panel 3: Detail
  detailPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#FAFBFC',
    overflow: 'hidden',
  },
  emptyDetail: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeader: {
    padding: '20px 28px',
    borderBottom: '1px solid #E2E8F0',
    background: '#FFFFFF',
  },
  detailSubject: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#0F172A',
    margin: '0 0 6px',
  },
  detailMeta: {
    fontSize: '0.78rem',
    color: '#64748B',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  threadArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 28px',
  },
  msgAvatar: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    flexShrink: 0,
    marginRight: 8,
    marginTop: 2,
  },
  replyBar: {
    padding: '16px 28px',
    borderTop: '1px solid #E2E8F0',
    background: '#FFFFFF',
  },
  replyTextarea: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #E2E8F0',
    borderRadius: 8,
    fontSize: '0.88rem',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    resize: 'none',
    boxSizing: 'border-box',
    lineHeight: 1.5,
  },
  replyActions: {
    display: 'flex',
    gap: 8,
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  sendBtn: {
    padding: '8px 20px',
    background: '#0F172A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    transition: 'opacity 0.2s',
  },
  resolveBtn: {
    padding: '8px 20px',
    background: '#22C55E',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    transition: 'opacity 0.2s',
  },

  emptyState: {
    padding: 40,
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: '0.9rem',
  },
}
