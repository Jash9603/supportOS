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
          {/* Placeholders for future pages */}
          <Route path="inbox" element={<div style={{padding:40}}>Inbox coming soon</div>} />
          <Route path="analytics" element={<div style={{padding:40}}>Analytics coming soon</div>} />
          <Route path="chatbot" element={<div style={{padding:40}}>Chatbot coming soon</div>} />
          <Route path="settings" element={<div style={{padding:40}}>Settings coming soon</div>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
