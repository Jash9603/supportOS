// -----------------------------------------------------------------------------
// ChatbotPage.jsx - The AI "Brain Control" Dashboard
// -----------------------------------------------------------------------------
//
// WHAT IS THIS PAGE?
//   This is where the founder manages the "brain" of the customer support bot.
//   It has two main columns:
//     1. Knowledge Base (Left): Upload PDFs/TXT files to teach the bot.
//     2. Test Preview (Right): A fake chat window to test the bot's knowledge
//        before real customers see it.
//
// HOW IT CONNECTS TO THE BACKEND:
//   - Uploading a file sends it to `POST /chatbot/documents`. A background
//     worker (Celery) reads the text, creates math embeddings, and saves them.
//   - The page polls every 2 seconds until the backend says the file is "indexed".
//   - Toggling the switch instantly updates the database via `PATCH /chatbot/toggle`.
//     If it's green (LIVE), the widget on the customer's site will route messages
//     to the AI instead of creating a standard open ticket immediately.
//   - Testing a question uses `POST /chatbot/test`. It runs a real search against
//     the vector database but DOES NOT create a real ticket. It formats the
//     responses using `react-markdown` so lists and bold text look beautiful.
// -----------------------------------------------------------------------------

import React, { useState, useEffect, useRef } from 'react'
import api from '../../lib/api'
import ReactMarkdown from 'react-markdown'
// ── SVG Icons ─────────────────────────────────────────────────────────────
const icons = {
  upload: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
  trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  x: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  robot: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" /></svg>,
  send: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
  spinner: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
      <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="4.93" x2="19.07" y2="7.76" />
    </svg>
  )
}

export default function ChatbotPage() {
  const [documents, setDocuments] = useState([])
  const [isLive, setIsLive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Preview
  const [testQuery, setTestQuery] = useState('')
  const [testMessages, setTestMessages] = useState([{ role: 'bot', text: 'Hi! Ask me a question to test my knowledge.' }])
  const [isTesting, setIsTesting] = useState(false)
  const fileInputRef = useRef(null)

  // Fetch initial data
  useEffect(() => {
    fetchConfig()
    fetchDocuments()
  }, [])

  // Basic polling if any docs are "processing"
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === 'processing')
    if (hasProcessing) {
      const interval = setInterval(fetchDocuments, 2000)
      return () => clearInterval(interval)
    }
  }, [documents])

  const fetchConfig = async () => {
    try {
      const res = await api.get('/chatbot/config')
      setIsLive(res.data.chatbot_enabled)
    } catch (err) {
      console.error('Failed to load config', err)
    }
  }

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/chatbot/documents')
      setDocuments(res.data)
    } catch (err) {
      console.error('Failed to load docs', err)
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleToggleLive = async () => {
    try {
      const newStatus = !isLive
      setIsLive(newStatus)
      await api.patch('/chatbot/toggle', { chatbot_enabled: newStatus })
    } catch (err) {
      setIsLive(!isLive) // Revert on fail
      console.error('Failed to toggle live status', err)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      await api.post('/chatbot/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      e.target.value = '' // Reset input
      fetchDocuments()
    } catch (err) {
      alert('Failed to upload document')
      console.error(err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteDoc = async (id) => {
    if (!confirm('Are you sure you want to delete this document? The bot will instantly forget its contents.')) return

    // Optimistic UI update
    setDocuments(prev => prev.filter(d => d.id !== id))
    try {
      await api.delete(`/chatbot/documents/${id}`)
    } catch (err) {
      alert('Failed to delete document')
      fetchDocuments() // Revert on fail
    }
  }

  const handleTestSubmit = async (e) => {
    e.preventDefault()
    if (!testQuery.trim() || isTesting) return

    const userMessage = { role: 'user', text: testQuery.trim() }
    setTestMessages(prev => [...prev, userMessage])
    setTestQuery('')
    setIsTesting(true)

    try {
      const res = await api.post('/chatbot/test', { question: userMessage.text })
      setTestMessages(prev => [...prev, { role: 'bot', text: res.data.answer, sources: res.data.sources }])
    } catch (err) {
      setTestMessages(prev => [...prev, { role: 'bot', text: 'Error simulating response.' }])
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="chatbot-container" style={styles.container}>
      {/* ── Header ── */}
      <div className="chatbot-header" style={styles.header}>
        <div>
          <h2 style={styles.title}>Chatbot Configuration</h2>
          <p style={styles.subtitle}>Train your AI assistant with your company's documents.</p>
        </div>

        {/* Toggle switch */}
        <div style={styles.toggleWrap}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: isLive ? '#10B981' : '#64748B' }}>
            {isLive ? '● LIVE TO CUSTOMERS' : '○ BOT IS PAUSED'}
          </span>
          <button
            onClick={handleToggleLive}
            style={{
              ...styles.toggleBtn,
              background: isLive ? '#10B981' : '#E2E8F0',
              justifyContent: isLive ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={styles.toggleKnob} />
          </button>
        </div>
      </div>

      <div className="chatbot-grid" style={styles.grid}>
        {/* ── Left Column: Knowledge Base ── */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Knowledge Base</h3>

          <div
            style={styles.dropzone}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".pdf,.txt"
              onChange={handleFileUpload}
            />
            {isUploading ? (
              <div style={styles.uploadingState}>
                {icons.spinner} Uploading...
              </div>
            ) : (
              <>
                <div style={styles.uploadIcon}>{icons.upload}</div>
                <div style={styles.uploadText}>Click to upload PDF or .TXT</div>
                <div style={styles.uploadSubtext}>Max 10MB per file</div>
              </>
            )}
          </div>

          <div style={styles.docList}>
            {documents.length === 0 && !isUploading && (
              <div style={styles.emptyState}>No documents uploaded yet.</div>
            )}

            {documents.map(doc => (
              <div key={doc.id} style={styles.docRow}>
                <div style={styles.docInfo}>
                  <div style={styles.docName}>{doc.filename}</div>
                  <div style={styles.docMeta}>
                    {doc.status === 'processing' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6366F1' }}>
                        {icons.spinner} Extracting & Indexing...
                      </span>
                    )}
                    {doc.status === 'indexed' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10B981' }}>
                        {icons.check} Indexed • {doc.chunk_count} chunks
                      </span>
                    )}
                    {doc.status === 'failed' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#EF4444' }}>
                        {icons.x} Failed to process
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteDoc(doc.id)}
                  style={styles.deleteBtn}
                  title="Delete Document"
                >
                  {icons.trash}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Column: Test Preview ── */}
        <div style={{ ...styles.card, display: 'flex', flexDirection: 'column' }}>
          <h3 style={styles.cardTitle}>Test Preview</h3>

          <div style={styles.chatArea}>
            {testMessages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: 12,
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                marginBottom: 16
              }}>
                <div style={{
                  ...styles.avatar,
                  background: msg.role === 'user' ? '#1E293B' : '#6366F1'
                }}>
                  {msg.role === 'user' ? 'U' : icons.robot}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    ...styles.bubble,
                    background: msg.role === 'user' ? '#1E293B' : '#F1F5F9',
                    color: msg.role === 'user' ? '#FFFFFF' : '#0F172A',
                    borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
                    borderBottomLeftRadius: msg.role === 'user' ? 16 : 4,
                  }}>
                    {msg.role === 'user' ? (
                      msg.text
                    ) : (
                      <div className="markdown-body">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Sources pill (if available) */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={styles.sourcesIndicator}>
                      ✓ Sourced from {msg.sources.length} document chunks
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTesting && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ ...styles.avatar, background: '#6366F1' }}>{icons.robot}</div>
                <div style={{ ...styles.bubble, background: '#F1F5F9', color: '#64748B' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {icons.spinner} Thinking...
                  </span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleTestSubmit} style={styles.inputArea}>
            <input
              type="text"
              value={testQuery}
              onChange={e => setTestQuery(e.target.value)}
              placeholder="Ask a question..."
              style={styles.input}
              disabled={isTesting}
            />
            <button type="submit" disabled={isTesting || !testQuery.trim()} style={styles.sendBtn}>
              {icons.send}
            </button>
          </form>
        </div>
      </div>

      {/* Global CSS for spinner animation and markdown formatting */}
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        /* Scrollbar styles omitted for brevity */
        .markdown-body { font-size: 0.95rem; line-height: 1.6; }
        .markdown-body p { margin-top: 0; margin-bottom: 0.75rem; }
        .markdown-body p:last-child { margin-bottom: 0; }
        .markdown-body ul, .markdown-body ol { margin-top: 0.5rem; margin-bottom: 0.75rem; padding-left: 1.5rem; }
        .markdown-body li { margin-bottom: 0.25rem; }
        .markdown-body strong { font-weight: 600; color: #0F172A; }
        .markdown-body code { background: #E2E8F0; padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.85em; font-family: monospace; }
        .markdown-body pre { background: #1E293B; color: #F8FAFC; padding: 0.75rem; border-radius: 6px; overflow-x: auto; margin-top: 0.5rem; margin-bottom: 0.75rem; }
        .markdown-body pre code { background: transparent; padding: 0; color: inherit; }
      `}</style>
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────
const styles = {
  container: {
    padding: '32px 40px',
    maxWidth: 1200,
    margin: '0 auto',
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
    fontWeight: 700,
    color: '#0F172A',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#64748B',
    margin: 0,
  },
  toggleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#FFFFFF',
    padding: '12px 20px',
    borderRadius: 12,
    border: '1px solid #E2E8F0',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  toggleBtn: {
    width: 44,
    height: 24,
    borderRadius: 12,
    border: 'none',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#FFFFFF',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: 24,
    height: 'calc(100vh - 180px)',
    minHeight: 500,
  },
  card: {
    background: '#FFFFFF',
    borderRadius: 16,
    border: '1px solid #E2E8F0',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -2px rgba(0,0,0,0.02)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  cardTitle: {
    margin: 0,
    padding: '24px 24px 16px',
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#0F172A',
    borderBottom: '1px solid #F1F5F9',
  },
  dropzone: {
    margin: 24,
    border: '2px dashed #CBD5E1',
    borderRadius: 12,
    padding: 32,
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: '#F8FAFC',
    transition: 'all 0.2s',
  },
  uploadIcon: {
    color: '#6366F1',
    marginBottom: 12,
  },
  uploadText: {
    fontSize: '0.925rem',
    fontWeight: 500,
    color: '#334155',
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: '0.8rem',
    color: '#94A3B8',
  },
  uploadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    color: '#6366F1',
    fontWeight: 500,
    fontSize: '0.925rem',
  },
  docList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 24px 24px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 0',
    color: '#94A3B8',
    fontSize: '0.925rem',
  },
  docRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 8,
    border: '1px solid #E2E8F0',
  },
  docInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  docName: {
    fontWeight: 500,
    fontSize: '0.925rem',
    color: '#0F172A',
  },
  docMeta: {
    fontSize: '0.8rem',
  },
  deleteBtn: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    color: '#94A3B8',
    width: 32,
    height: 32,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  chatArea: {
    flex: 1,
    padding: 24,
    overflowY: 'auto',
    background: '#FFFFFF',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '0.9rem',
    flexShrink: 0,
  },
  bubble: {
    padding: '12px 16px',
    borderRadius: 16,
    fontSize: '0.925rem',
    lineHeight: 1.5,
    maxWidth: '85%',
  },
  sourcesIndicator: {
    fontSize: '0.7rem',
    color: '#10B981',
    marginTop: 6,
    padding: '2px 8px',
    background: '#ECFDF5',
    borderRadius: 10,
    display: 'inline-block',
  },
  inputArea: {
    display: 'flex',
    gap: 12,
    padding: 20,
    borderTop: '1px solid #E2E8F0',
    background: '#F8FAFC',
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    border: '1px solid #CBD5E1',
    padding: '0 20px',
    fontSize: '0.925rem',
    outline: 'none',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: '#6366F1',
    color: '#FFFFFF',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  }
}
