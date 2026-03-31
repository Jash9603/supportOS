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

export default function App() {
  return (
    <Routes>
      <Route path="/"        element={<Landing />} />
      <Route path="/login"   element={<Login />} />
      <Route path="/signup"  element={<Signup />} />

      {/* Protected routes — Phase 2+ */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard/*" element={<div style={{padding:40,fontFamily:'Inter,sans-serif'}}>Dashboard coming in Phase 2 🚀</div>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
