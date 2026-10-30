import { useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowRight, CheckCircle2, Mail } from 'lucide-react'
import { clientKeys } from '../../../lib/queryKeys'
import { claimClientAccess, getTrainerPublic, requestClientAccess } from '../api/auth.api'
import { useAuth } from '../hooks/useAuth'
import './LoginPage.css'

export default function TrainerAccessPage() {
  const { slug = '' } = useParams()
  const queryClient = useQueryClient()
  const { user, profile, loading, signOut } = useAuth()

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: trainer, isLoading: loadingTrainer, error: trainerError } = useQuery({
    queryKey: ['trainer-public', slug],
    queryFn: () => getTrainerPublic(slug),
    enabled: Boolean(slug),
  })

  const isStudentSession = Boolean(user && profile?.role === 'client')

  const claim = useQuery({
    queryKey: ['client-claim', slug, user?.id],
    queryFn: async () => {
      const clientId = await claimClientAccess(slug)
      await queryClient.invalidateQueries({ queryKey: clientKeys.all })
      return clientId
    },
    enabled: isStudentSession && Boolean(trainer),
    retry: false,
    gcTime: 0,
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Ingresá un correo válido.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      await requestClientAccess(slug, email)
      setSent(true)
    } catch (err) {
      console.error('Access request error:', err)
      setFormError('No pudimos procesar el pedido. Intentá de nuevo en unos minutos.')
    } finally {
      setSubmitting(false)
    }
  }

  if (claim.data) return <Navigate to="/alumno" replace />

  const trainerName = trainer ? `${trainer.nombre} ${trainer.apellido}`.trim() : ''
  const isBusy = loading || loadingTrainer || claim.isLoading

  let content: React.ReactNode
  if (isBusy) {
    content = <p className="auth-card__desc">Cargando...</p>
  } else if (trainerError) {
    content = (
      <div className="auth-alert auth-alert--error" role="alert">
        <AlertCircle size={18} className="auth-alert__icon" />
        <span>No pudimos cargar esta página. Intentá de nuevo en unos minutos.</span>
      </div>
    )
  } else if (!trainer) {
    content = (
      <>
        <h2 className="auth-card__title">Link no válido</h2>
        <p className="auth-card__desc">Pedile a tu entrenador el link correcto.</p>
      </>
    )
  } else if (user && profile?.role === 'trainer') {
    content = (
      <>
        <h2 className="auth-card__title">Este es el acceso de tus alumnos</h2>
        <p className="auth-card__desc">Tenés la sesión iniciada como entrenador.</p>
        <Link className="auth-submit-btn" to="/admin/dashboard">Ir a mi panel</Link>
      </>
    )
  } else if (claim.error) {
    const notInvited = claim.error.message.includes('not_invited')
    content = (
      <>
        <h2 className="auth-card__title">No pudimos darte acceso</h2>
        <p className="auth-card__desc">
          {notInvited
            ? `Tu correo no está cargado por ${trainerName}. Pedile que lo agregue o probá con otro correo.`
            : `Hubo un problema con tu cuenta. Avisale a ${trainerName}.`}
        </p>
        <button type="button" className="auth-submit-btn" onClick={() => signOut()}>
          Probar con otro correo
        </button>
      </>
    )
  } else if (sent) {
    content = (
      <>
        <div className="auth-alert auth-alert--success" role="status">
          <CheckCircle2 size={18} className="auth-alert__icon" />
          <span>Si tu correo está cargado por {trainerName}, te enviamos un link para entrar.</span>
        </div>
        <p className="auth-card__desc">Revisá también la carpeta de spam.</p>
      </>
    )
  } else {
    content = (
      <>
        <div className="auth-card__header">
          <h2 className="auth-card__title">Entrená con {trainerName}</h2>
          <p className="auth-card__desc">
            Ingresá el correo que le diste a tu entrenador. Te enviamos un link para entrar, sin contraseña.
          </p>
        </div>

        {formError && (
          <div className="auth-alert auth-alert--error" role="alert">
            <AlertCircle size={18} className="auth-alert__icon" />
            <span>{formError}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="student-email">Correo Electrónico</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input
                id="student-email"
                type="email"
                autoComplete="email"
                placeholder="alumno@ejemplo.com"
                className="auth-input"
                value={email}
                onChange={e => {
                  setEmail(e.target.value)
                  setFormError(null)
                }}
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={submitting}>
            {submitting ? (
              <span className="auth-btn-spinner" />
            ) : (
              <>
                <span>Enviarme el link</span>
                <ArrowRight size={16} />
              </>
            )}
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
