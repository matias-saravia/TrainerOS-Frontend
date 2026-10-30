import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/** Sends each account to its own home. */
export default function RootRedirect() {
  const { user, profile, loading } = useAuth()

  if (loading) return null
  if (!user || !profile) return <Navigate to="/login" replace />

  return <Navigate to={profile.role === 'trainer' ? '/admin/dashboard' : '/alumno'} replace />
}
