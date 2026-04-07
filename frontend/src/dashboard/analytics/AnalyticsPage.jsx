// -----------------------------------------------------------------------------
// AnalyticsPage.jsx — Deep Analytics Dashboard
// -----------------------------------------------------------------------------
//
// WHAT IS THIS PAGE?
//   The "killer feature" of SupportOS. While Overview shows quick KPIs,
//   this page gives founders deep, actionable intelligence:
//     - What are customers REALLY asking about? (AI clustering)
//     - Are customers getting angrier over time? (OpenAI sentiment)
//     - When should I schedule human agents? (peak hours heatmap)
//     - Is the bot getting smarter? (escalation trend)
//     - How much faster is the bot vs humans? (response comparison)
//
// DATE FILTERING:
//   Dropdown at top: 7d / 30d / 90d. All charts react to the filter.
//
// PDF EXPORT:
//   Captures the entire analytics section as an image and wraps it
//   into a branded PDF with org name and date range.
// -----------------------------------------------------------------------------

import { useState, useEffect, useRef } from 'react'
import api from '../../lib/api'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

// ── Color Palette ──
const C = {
  indigo: '#6366F1',
  purple: '#8B5CF6',
  amber: '#F59E0B',
  emerald: '#10B981',
  rose: '#F43F5E',
  sky: '#0EA5E9',
  slate: '#64748B',
  dark: '#0F172A',
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const [exporting, setExporting] = useState(false)
  const reportRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    api.get(`/analytics/deep?days=${days}`)
      .then(res => { setData(res.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [days])

  const handleExport = async () => {
    if (!reportRef.current) return
    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      // Use lower scale + JPEG to avoid massive blob downloads
      const canvas = await html2canvas(reportRef.current, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#F8FAFC',
        logging: false,
      })

      // JPEG at 85% quality = ~1MB vs 14MB PNG
      const imgData = canvas.toDataURL('image/jpeg', 0.85)

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = 10

      // Branded header
      pdf.setFillColor(15, 23, 42)
      pdf.rect(0, 0, pageW, 18, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(12)
      pdf.text('SupportOS Analytics Report', margin, 12)
      pdf.setFontSize(8)
      pdf.setTextColor(148, 163, 184)
      pdf.text(`${data?.period_label || ''} • Generated ${new Date().toLocaleDateString()}`, margin, 16)

      // Fit image to page width, scale height proportionally
      const contentW = pageW - margin * 2
      const imgH = (canvas.height * contentW) / canvas.width

      // Place image (jsPDF clips overflow automatically)
      pdf.addImage(imgData, 'JPEG', margin, 22, contentW, imgH)

      pdf.save(`SupportOS_Analytics_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (e) {
      console.error('PDF export failed:', e)
      alert('PDF export failed. Please try again.')
    }
    setExporting(false)
  }

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <h1 style={s.title}>Analytics</h1>
          <p style={s.subtitle}>Crunching your data...</p>
        </div>
        <div style={s.loadingGrid}>
          {[1,2,3,4,5,6].map(i => <div key={i} style={s.skeletonCard} />)}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ ...s.page, textAlign: 'center', paddingTop: 120 }}>
        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#64748B' }}>No Data</div>
        <h2 style={{ color: C.dark }}>No analytics data yet</h2>
        <p style={{ color: C.slate }}>Start receiving tickets to see insights here.</p>
      </div>
    )
  }

  const { satisfaction_trend, top_questions, resolution, peak_hours, escalation_trend, response_time_trend } = data

  // Donut chart data
  const donutData = [
    { name: 'Bot Resolved', value: resolution.bot_resolved, color: C.indigo },
    { name: 'Human Resolved', value: resolution.human_resolved, color: C.amber },
    { name: 'Still Open', value: resolution.still_open, color: C.slate },
  ].filter(d => d.value > 0)

  return (
    <div style={s.page}>
      {/* ── Header ── */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Analytics</h1>
          <p style={s.subtitle}>
            {data.period_label} • {data.total_tickets} tickets analyzed
          </p>
        </div>
        <div style={s.controls}>
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            style={s.select}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={handleExport} style={s.exportBtn} disabled={exporting}>
            {exporting ? 'Generating...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* ── Charts Grid ── */}
      <div ref={reportRef}>
        <div style={s.grid2}>
          {/* Satisfaction Trend */}
          <Card title="Customer Satisfaction" subtitle="Higher is better (100 = happy)">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={satisfaction_trend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="satGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.emerald} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={fmtDate} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtDateFull} formatter={v => [`${v}%`, 'Satisfaction']} />
                <Area type="monotone" dataKey="score" stroke={C.emerald} strokeWidth={2.5} fill="url(#satGrad)"
                  dot={{ fill: C.emerald, r: 3, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Top Questions */}
          <Card title="Top Customer Questions" subtitle="AI-clustered by topic similarity">
            {top_questions.length === 0 ? (
              <div style={s.emptyState}>No questions yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={top_questions} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="question" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={140}
                    tickFormatter={t => t.length > 22 ? t.slice(0, 22) + '…' : t} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill={C.indigo} radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        <div style={s.grid3}>
          {/* Resolution Breakdown */}
          <Card title="Resolution Breakdown" subtitle="Who handled the tickets?">
            {donutData.length === 0 ? (
              <div style={s.emptyState}>No resolved tickets yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Legend verticalAlign="bottom" iconType="circle" iconSize={8}
                    formatter={(v) => <span style={{ color: '#334155', fontSize: '0.78rem' }}>{v}</span>} />
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Peak Hours Heatmap */}
          <Card title="Peak Support Hours" subtitle="When customers need help most">
            <Heatmap grid={peak_hours.grid} maxValue={peak_hours.max_value} />
          </Card>

          {/* Escalation Rate */}
          <Card title="Escalation Rate" subtitle="% of tickets needing human help">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={escalation_trend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="escGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.rose} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.rose} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={fmtDate} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtDateFull} formatter={v => [`${v}%`, 'Escalation Rate']} />
                <Area type="monotone" dataKey="rate" stroke={C.rose} strokeWidth={2.5} fill="url(#escGrad)"
                  dot={{ fill: C.rose, r: 3, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Response Time Comparison — full width */}
        <div style={{ marginTop: 20 }}>
          <Card title="Response Time: Bot vs Human" subtitle="Average first-reply time in minutes">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={response_time_trend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={fmtDate} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} unit="m" />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtDateFull}
                  formatter={(v, name) => [`${v} min`, name === 'bot_avg' ? 'Bot' : 'Human']} />
                <Line type="monotone" dataKey="bot_avg" stroke={C.indigo} strokeWidth={2.5} name="bot_avg"
                  dot={{ fill: C.indigo, r: 4, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="human_avg" stroke={C.amber} strokeWidth={2.5} name="human_avg"
                  dot={{ fill: C.amber, r: 4, strokeWidth: 0 }} strokeDasharray="6 3" />
                <Legend formatter={v => v === 'bot_avg' ? 'Bot' : 'Human'}
                  iconType="line" iconSize={16} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  )
}


// ── Sub-components ──────────────────────────────────────────────────────────

function Card({ title, subtitle, children }) {
  return (
    <div style={s.card}>
      <h3 style={s.cardTitle}>{title}</h3>
      {subtitle && <p style={s.cardSub}>{subtitle}</p>}
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  )
}

function Heatmap({ grid, maxValue }) {
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(24, 1fr)', gap: 2, minWidth: 500 }}>
        {/* Header row */}
        <div />
        {hours.map(h => (
          <div key={h} style={{ fontSize: '0.6rem', color: '#94A3B8', textAlign: 'center' }}>
            {h % 3 === 0 ? `${h}` : ''}
          </div>
        ))}
        {/* Data rows */}
        {grid.map((row, dayIdx) => (
          <>
            <div key={`label-${dayIdx}`} style={{ fontSize: '0.7rem', color: '#64748B', display: 'flex', alignItems: 'center' }}>
              {dayLabels[dayIdx]}
            </div>
            {row.map((val, hourIdx) => {
              const intensity = maxValue > 0 ? val / maxValue : 0
              return (
                <div
                  key={`${dayIdx}-${hourIdx}`}
                  title={`${dayLabels[dayIdx]} ${hourIdx}:00 — ${val} tickets`}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 3,
                    background: intensity === 0
                      ? '#F1F5F9'
                      : `rgba(99, 102, 241, ${0.15 + intensity * 0.85})`,
                    transition: 'transform 0.1s',
                    cursor: 'default',
                  }}
                />
              )
            })}
          </>
        ))}
      </div>
    </div>
  )
}


// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDateFull(d) {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const tooltipStyle = {
  background: '#0F172A', border: 'none', borderRadius: 8,
  color: '#F8FAFC', fontSize: '0.82rem',
  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
}


// ── Styles ──────────────────────────────────────────────────────────────────

const s = {
  page: {
    padding: '32px 40px',
    maxWidth: 1320,
    margin: '0 auto',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: {
    fontFamily: 'Syne, sans-serif',
    fontSize: '2rem',
    fontWeight: 800,
    color: '#0F172A',
    margin: '0 0 6px',
    letterSpacing: '-0.03em',
  },
  subtitle: { fontSize: '1rem', color: '#64748B', margin: 0 },
  controls: { display: 'flex', gap: 12, alignItems: 'center' },
  select: {
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid #E2E8F0',
    fontSize: '0.85rem',
    fontFamily: 'Inter, sans-serif',
    color: '#334155',
    background: '#FFFFFF',
    cursor: 'pointer',
    outline: 'none',
  },
  exportBtn: {
    padding: '10px 20px',
    borderRadius: 10,
    border: 'none',
    background: '#0F172A',
    color: '#F8FAFC',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    transition: 'opacity 0.15s',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.2fr 1fr',
    gap: 20,
    marginTop: 20,
  },
  card: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  },
  cardTitle: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: '1.05rem',
    color: '#0F172A',
    margin: 0,
  },
  cardSub: { fontSize: '0.78rem', color: '#94A3B8', margin: '4px 0 0' },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
    color: '#94A3B8',
    fontSize: '0.9rem',
  },
  loadingGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    marginTop: 24,
  },
  skeletonCard: {
    height: 280,
    borderRadius: 16,
    background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
    backgroundSize: '400px 100%',
    animation: 'shimmer 1.5s infinite',
  },
}
