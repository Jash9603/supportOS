// lib/api.js - Axios API Client
// All API calls go through this single instance.
// withCredentials: true → browser automatically sends the httpOnly auth cookie
// on every request, so we never touch tokens manually in JS.

import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,          // sends httpOnly cookie automatically
  headers: { 'Content-Type': 'application/json' },
})

// ── Auth endpoints ──────────────────────────────────────────────────────────
export const authApi = {
  signup: (data) => api.post('/auth/signup', data),
  login:  (data) => api.post('/auth/login', data),
  logout: ()     => api.post('/auth/logout'),
  me:     ()     => api.get('/auth/me'),
}

export default api
