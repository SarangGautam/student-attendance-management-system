import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading your account…</div>
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

export function PublicOnly() {
  const { user, loading } = useAuth()
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading your account…</div>
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />
}
