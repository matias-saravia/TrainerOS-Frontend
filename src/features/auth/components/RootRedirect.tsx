import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import LandingPage from '../../landing/pages/LandingPage'

/** A failed or canceled Google sign-in comes back here with the error in the URL. */
function hasOAuthError(): boolean {
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.slice(1))
  return query.has('error') || hash.has('error')
}

/** Shows the landing to visitors and sends each account to its own home. */
export default function RootRedirect() {
  const { user, profile, loading } = useAuth()

  if (hasOAuthError()) return <Navigate to="/login" replace state={{ oauthError: true }} />
  if (loading) return null
  if (!user || !profile) return <LandingPage />

  return <Navigate to={profile.role === 'trainer' ? '/admin/dashboard' : '/alumno'} replace />
}
