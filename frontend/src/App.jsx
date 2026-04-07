// App.jsx — Route definitions
// / → Landing page (public)
// /login → Login form (public)
// /signup → Signup form (public)
// /dashboard/* → Protected (requires auth cookie) — built in Phase 2+

import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './dashboard/DashboardLayout'
import Overview from './dashboard/Overview'
import WidgetChat from './pages/widget/WidgetChat'
import Inbox from './dashboard/inbox/Inbox'
import ChatbotPage from './dashboard/chatbot/ChatbotPage'
import AnalyticsPage from './dashboard/analytics/AnalyticsPage'
import SettingsPage from './dashboard/settings/SettingsPage'
import { useOutletContext } from 'react-router-dom'

// Wrapper to extract user from DashboardLayout's Outlet context
// and pass it as a prop to Inbox (which needs it for API calls)
function InboxPage() {
  const { user } = useOutletContext()
  return <Inbox user={user} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/"        element={<Landing />} />
      <Route path="/login"   element={<Login />} />
      <Route path="/signup"  element={<Signup />} />

      {/* Public: embeddable chat widget (loaded inside iframe) */}
      <Route path="/widget/:orgId" element={<WidgetChat />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route path="" element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="inbox" element={<InboxPage />} />
          {/* Placeholders for future pages */}
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="chatbot" element={<ChatbotPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
