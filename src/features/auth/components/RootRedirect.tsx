import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import LandingPage from '../../landing/pages/LandingPage'

/** Shows the landing to visitors and sends each account to its own home. */
export default function RootRedirect() {
  const { user, profile, loading } = useAuth()

  if (loading) return null
  if (!user || !profile) return <LandingPage />

  return <Navigate to={profile.role === 'trainer' ? '/admin/dashboard' : '/alumno'} replace />
}
