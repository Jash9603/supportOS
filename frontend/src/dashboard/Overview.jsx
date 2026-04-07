// -----------------------------------------------------------------------------
// Overview.jsx — The Founder's Command Center
// -----------------------------------------------------------------------------
//
// WHAT IS THIS PAGE?
//   The first thing a founder sees after logging in. It shows at-a-glance
//   metrics about their support operation:
//     1. Four KPI cards (total tickets, open, response time, bot success rate)
//     2. A 7-day ticket volume area chart
//     3. A table of the 5 most recent tickets
//
// HOW IT CONNECTS TO THE BACKEND:
//   One single API call: GET /analytics/overview
//   The backend computes everything (SQL aggregations) and returns it all
//   at once. No waterfall requests, no loading spinners chaining.
// -----------------------------------------------------------------------------

import { useState, useEffect } from 'react'
import api from '../lib/api'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

export default function Overview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/analytics/overview')
      .then(res => { setData(res.data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} />

  const { summary, daily_volume, recent_tickets } = data

  return (
    <div style={styles.container}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Overview</h1>
          <p style={styles.subtitle}>Your support operations at a glance</p>
        </div>
        <div style={styles.liveTag}>
          <span style={styles.liveDot} />
          Live Data
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={styles.kpiGrid}>
        <KpiCard
          label="Total Tickets"
          value={summary.total_tickets_7d}
          sub="Last 7 days"
          icon="📩"
          color="#6366F1"
        />
        <KpiCard
          label="Open Now"
          value={summary.open_tickets}
          sub="Awaiting resolution"
          icon="🔓"
          color="#F59E0B"
        />
        <KpiCard
          label="Avg Response"
          value={formatResponseTime(summary.avg_response_mins)}
          sub="First reply time"
          icon="⚡"
          color="#10B981"
        />
        <KpiCard
          label="Bot Resolution"
          value={`${summary.bot_resolution_pct}%`}
          sub="Resolved without human"
          icon="🤖"
          color="#8B5CF6"
        />
      </div>

      {/* ── Chart + Recent Tickets ── */}
      <div style={styles.bottomGrid}>
        {/* Chart Card */}
        <div style={styles.chartCard}>
          <h3 style={styles.cardTitle}>Ticket Volume</h3>
          <p style={styles.cardSubtitle}>Last 7 days</p>
          <div style={{ height: 260, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily_volume} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#94A3B8' }}
                  tickFormatter={(d) => {
                    const date = new Date(d + 'T00:00:00')
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0F172A',
                    border: 'none',
                    borderRadius: 8,
                    color: '#F8FAFC',
                    fontSize: '0.85rem',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                  }}
                  labelFormatter={(d) => {
                    const date = new Date(d + 'T00:00:00')
                    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                  }}
                  formatter={(value) => [value, 'Tickets']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  fill="url(#colorTickets)"
                  dot={{ fill: '#6366F1', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#6366F1', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Tickets Table */}
        <div style={styles.tableCard}>
          <h3 style={styles.cardTitle}>Recent Tickets</h3>
          <p style={styles.cardSubtitle}>Latest 5 conversations</p>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Subject</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Route</th>
                </tr>
              </thead>
              <tbody>
                {recent_tickets.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ ...styles.td, textAlign: 'center', color: '#94A3B8', padding: 32 }}>
                      No tickets yet — they'll appear here once customers start chatting.
                    </td>
                  </tr>
                ) : (
                  recent_tickets.map((t) => (
                    <tr key={t.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.subjectText}>{t.subject}</div>
                        <div style={styles.timeText}>{formatTimeAgo(t.created_at)}</div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.customerName}>{t.requester_name}</span>
                      </td>
                      <td style={styles.td}>
                        <StatusBadge status={t.status} />
                      </td>
                      <td style={styles.td}>
                        <RouteBadge needsHuman={t.needs_human} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}


// ── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, color }) {
  return (
    <div style={styles.kpiCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={styles.kpiLabel}>{label}</div>
          <div style={{ ...styles.kpiValue, color }}>{value}</div>
        </div>
        <div style={{ ...styles.kpiIcon, background: `${color}15` }}>
          <span style={{ fontSize: '1.4rem' }}>{icon}</span>
        </div>
      </div>
      <div style={styles.kpiSub}>{sub}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  const colors = {
    open: { bg: '#FEF3C7', text: '#92400E', label: 'Open' },
    pending: { bg: '#DBEAFE', text: '#1E40AF', label: 'Pending' },
    resolved: { bg: '#D1FAE5', text: '#065F46', label: 'Resolved' },
  }
  const c = colors[status] || colors.open
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: '4px 10px', borderRadius: 20,
      fontSize: '0.75rem', fontWeight: 600,
    }}>
      {c.label}
    </span>
  )
}

function RouteBadge({ needsHuman }) {
  return (
    <span style={{
      background: needsHuman ? '#FEE2E2' : '#EDE9FE',
      color: needsHuman ? '#991B1B' : '#5B21B6',
      padding: '4px 10px', borderRadius: 20,
      fontSize: '0.75rem', fontWeight: 600,
    }}>
      {needsHuman ? '👤 Human' : '🤖 Bot'}
    </span>
  )
}

function LoadingSkeleton() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Overview</h1>
          <p style={styles.subtitle}>Loading your dashboard...</p>
        </div>
      </div>
      <div style={styles.kpiGrid}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ ...styles.kpiCard, minHeight: 120 }}>
            <div style={styles.skeleton} />
            <div style={{ ...styles.skeleton, width: '40%', height: 32, marginTop: 8 }} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
      `}</style>
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div style={{ ...styles.container, textAlign: 'center', paddingTop: 120 }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
      <h2 style={{ color: '#0F172A', marginBottom: 8 }}>Failed to load analytics</h2>
      <p style={{ color: '#64748B' }}>{message}</p>
    </div>
  )
}


// ── Helpers ──────────────────────────────────────────────────────────────────

function formatResponseTime(mins) {
  if (!mins || mins === 0) return '—'
  if (mins < 1) return `${Math.round(mins * 60)}s`
  if (mins < 60) return `${Math.round(mins)}m`
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return `${h}h ${m}m`
}

function formatTimeAgo(isoString) {
  const now = new Date()
  const then = new Date(isoString)
  const diffMs = now - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}


// ── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  container: {
    padding: '32px 40px',
    maxWidth: 1280,
    margin: '0 auto',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  title: {
    fontFamily: 'Syne, sans-serif',
    fontSize: '2rem',
    fontWeight: 800,
    color: '#0F172A',
    margin: '0 0 6px 0',
    letterSpacing: '-0.03em',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#64748B',
    margin: 0,
  },
  liveTag: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#F0FDF4',
    color: '#15803D',
    padding: '8px 16px',
    borderRadius: 20,
    fontSize: '0.82rem',
    fontWeight: 600,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#22C55E',
    boxShadow: '0 0 6px rgba(34,197,94,0.5)',
    animation: 'pulse 2s ease-in-out infinite',
  },

  // ── KPI Cards ──
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 20,
    marginBottom: 28,
  },
  kpiCard: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 16,
    padding: '24px 24px 18px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  kpiLabel: {
    fontSize: '0.8rem',
    fontWeight: 500,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 8,
  },
  kpiValue: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 800,
    fontSize: '2rem',
    letterSpacing: '-0.03em',
    lineHeight: 1,
  },
  kpiIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiSub: {
    fontSize: '0.78rem',
    color: '#94A3B8',
    marginTop: 10,
  },

  // ── Bottom Grid ──
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr',
    gap: 20,
  },
  chartCard: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  },
  tableCard: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    display: 'flex',
    flexDirection: 'column',
  },
  cardTitle: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: '1.1rem',
    color: '#0F172A',
    margin: 0,
  },
  cardSubtitle: {
    fontSize: '0.8rem',
    color: '#94A3B8',
    margin: '4px 0 0',
  },

  // ── Table ──
  tableWrap: {
    flex: 1,
    overflowY: 'auto',
    marginTop: 16,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    fontSize: '0.72rem',
    fontWeight: 600,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #F1F5F9',
  },
  tr: {
    transition: 'background 0.1s',
  },
  td: {
    padding: '12px 12px',
    borderBottom: '1px solid #F8FAFC',
    verticalAlign: 'middle',
  },
  subjectText: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#0F172A',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 180,
  },
  timeText: {
    fontSize: '0.72rem',
    color: '#94A3B8',
    marginTop: 2,
  },
  customerName: {
    fontSize: '0.82rem',
    color: '#334155',
  },

  // ── Skeleton ──
  skeleton: {
    height: 14,
    borderRadius: 6,
    width: '60%',
    background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
    backgroundSize: '200px 100%',
    animation: 'shimmer 1.5s infinite',
  },
}
