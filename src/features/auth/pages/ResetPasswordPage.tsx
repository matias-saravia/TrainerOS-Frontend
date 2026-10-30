import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Lock } from 'lucide-react'
import { updatePassword } from '../api/auth.api'
import { useAuth } from '../hooks/useAuth'
import './LoginPage.css'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('La contraseña debe tener un mínimo de 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await updatePassword(password)
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Password update error:', err)
      setError('No pudimos cambiar la contraseña. Pedí un link nuevo e intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  let content: React.ReactNode
  if (loading) {
    content = <p className="auth-card__desc">Cargando...</p>
  } else if (!user) {
    content = (
      <>
        <h2 className="auth-card__title">El link venció</h2>
        <p className="auth-card__desc">Pedí uno nuevo desde la pantalla de inicio de sesión.</p>
        <Link className="auth-submit-btn" to="/login">Volver a iniciar sesión</Link>
      </>
    )
  } else {
    content = (
      <>
        <div className="auth-card__header">
          <h2 className="auth-card__title">Crear nueva contraseña</h2>
        </div>

        {error && (
          <div className="auth-alert auth-alert--error" role="alert">
            <AlertCircle size={18} className="auth-alert__icon" />
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="new-password">Nueva contraseña</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                className="auth-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="confirm-password">Confirmar contraseña</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                className="auth-input"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" className="auth-submit-btn" disabled={submitting}>
            {submitting ? <span className="auth-btn-spinner" /> : 'Guardar contraseña'}
          </button>
        </form>
      </>
    )
  }

  return (
    <div className="auth-viewport">
      <div className="auth-terminal" style={{ width: '100%' }}>
        <div className="auth-card">{content}</div>
      </div>
    </div>
  )
}
