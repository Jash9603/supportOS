// -----------------------------------------------------------------------------
// components/NotificationPanel.jsx - Notification Dropdown
// -----------------------------------------------------------------------------
//
// A floating dropdown that appears when the bell icon is clicked.
// Shows recent notifications grouped by unread/read, with icons per type
// and click-to-navigate functionality.
// -----------------------------------------------------------------------------

import { useNavigate } from 'react-router-dom'

// Notification type → icon + color
const typeConfig = {
  new_ticket:  { icon: '🎫', color: '#6366F1', label: 'New Ticket' },
  new_message: { icon: '💬', color: '#10B981', label: 'New Message' },
  escalation:  { icon: '⚠️', color: '#EF4444', label: 'Escalation' },
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

export default function NotificationPanel({ notifications, onMarkAllRead, onMarkRead, onClose }) {
  const navigate = useNavigate()

  const handleNotificationClick = (notif) => {
    if (!notif.is_read && onMarkRead) {
      onMarkRead(notif.id)
    }
    if (notif.ticket_id) {
      navigate('/dashboard/inbox')
    }
    onClose()
  }

  const unread = notifications.filter(n => !n.is_read)
  const read = notifications.filter(n => n.is_read)

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />

      {/* Panel */}
      <div className="notification-panel" style={styles.panel}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.headerTitle}>Notifications</h3>
          {unread.length > 0 && (
            <button style={styles.markAllBtn} onClick={onMarkAllRead}>
              Mark all read
            </button>
          )}
        </div>

        {/* Notification List */}
        <div style={styles.list}>
          {notifications.length === 0 ? (
            <div style={styles.empty}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔔</div>
              <div style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
                No notifications yet
              </div>
              <div style={{ color: '#CBD5E1', fontSize: '0.78rem', marginTop: 4 }}>
                You'll see alerts here when customers send messages
              </div>
            </div>
          ) : (
            <>
              {/* Unread section */}
              {unread.length > 0 && (
                <>
                  <div style={styles.sectionLabel}>
                    New ({unread.length})
                  </div>
                  {unread.map(n => (
                    <NotifItem key={n.id} notif={n} onClick={() => handleNotificationClick(n)} />
                  ))}
                </>
              )}

              {/* Read section */}
              {read.length > 0 && (
                <>
                  <div style={{ ...styles.sectionLabel, color: '#CBD5E1' }}>
                    Earlier
                  </div>
                  {read.map(n => (
                    <NotifItem key={n.id} notif={n} isRead onClick={() => handleNotificationClick(n)} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

function NotifItem({ notif, isRead = false, onClick }) {
  const config = typeConfig[notif.type] || typeConfig.new_message

  return (
    <button
      style={{
        ...styles.item,
        opacity: isRead ? 0.6 : 1,
        background: isRead ? 'transparent' : 'rgba(99, 102, 241, 0.04)',
      }}
      onClick={onClick}
    >
      {/* Type icon */}
      <div style={{
        ...styles.iconCircle,
        background: isRead ? '#F1F5F9' : `${config.color}15`,
      }}>
        <span style={{ fontSize: '1rem' }}>{config.icon}</span>
      </div>

      {/* Content */}
      <div style={styles.itemContent}>
        <div style={{
          ...styles.itemTitle,
          fontWeight: isRead ? 400 : 600,
        }}>
          {notif.title}
        </div>
        {notif.body && (
          <div style={styles.itemBody}>{notif.body}</div>
        )}
      </div>

      {/* Timestamp */}
      <div style={styles.itemTime}>
        {formatTimeAgo(notif.created_at)}
      </div>

      {/* Unread dot */}
      {!isRead && <div style={styles.unreadDot} />}
    </button>
  )
}


// ── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
  },
  panel: {
    position: 'absolute',
    top: 'calc(100% + 12px)',
    right: 0,
    width: 380,
    maxHeight: 480,
    background: 'rgba(255, 255, 255, 0.96)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: 16,
    border: '1px solid rgba(226, 232, 240, 0.8)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
    zIndex: 999,
    animation: 'notifSlideIn 0.2s ease-out',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px 12px',
    borderBottom: '1px solid #F1F5F9',
  },
  headerTitle: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: '1rem',
    color: '#0F172A',
    margin: 0,
  },
  markAllBtn: {
    background: 'none',
    border: 'none',
    color: '#6366F1',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 6,
    transition: 'background 0.15s',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 0',
  },
  empty: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  sectionLabel: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding: '8px 20px 4px',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '12px 20px',
    width: '100%',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.1s',
    position: 'relative',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: '0.83rem',
    color: '#0F172A',
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemBody: {
    fontSize: '0.75rem',
    color: '#94A3B8',
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemTime: {
    fontSize: '0.7rem',
    color: '#CBD5E1',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    marginTop: 2,
  },
  unreadDot: {
    position: 'absolute',
    left: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#6366F1',
  },
}
