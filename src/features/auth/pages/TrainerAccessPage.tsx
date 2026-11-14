import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { clientKeys } from '../../../lib/queryKeys'
import {
  claimClientAccess,
  createClientPassword,
  getTrainerPublic,
  requestClientAccess,
  signInClient,
} from '../api/auth.api'
import { useAuth } from '../hooks/useAuth'
import './LoginPage.css'
import Logo from '../../../components/Logo'

const MIN_PASSWORD = 8
const TOO_MANY = 'Hiciste demasiados intentos. Esperá 15 minutos y volvé a probar.'

// The email is kept only when the student asked to be remembered
const EMAIL_KEY = 'traineros:student-email'

function readSavedEmail() {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

function saveEmail(email: string, remember: boolean) {
  try {
    if (remember) localStorage.setItem(EMAIL_KEY, email)
    else localStorage.removeItem(EMAIL_KEY)
  } catch {
    // Without storage the email is simply not remembered
  }
}

type Step = 'email' | 'create_password' | 'password' | 'sent'

export default function TrainerAccessPage() {
  const { slug = '' } = useParams()
  const queryClient = useQueryClient()
  const { user, profile, loading, signOut } = useAuth()

  const [email, setEmail] = useState(readSavedEmail)
  const [step, setStep] = useState<Step>('email')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [forgot, setForgot] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const passwordInput = useRef<HTMLInputElement>(null)

  const cleanEmail = email.trim().toLowerCase()

  const { data: trainer, isLoading: loadingTrainer, error: trainerError } = useQuery({
    queryKey: ['trainer-public', slug],
    queryFn: () => getTrainerPublic(slug),
    enabled: Boolean(slug),
  })

  const trainerName = trainer ? `${trainer.nombre} ${trainer.apellido}`.trim() : ''
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

  const goToStep = (next: Step) => {
    setStep(next)
    setPassword('')
    setConfirm('')
    setForgot(false)
    // The password field appears with the new step: focus it once it is there
    requestAnimationFrame(() => passwordInput.current?.focus())
  }

  const backToEmail = () => {
    setStep('email')
    setFormError(null)
  }

  const handleEmail = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError('Ingresá un correo válido.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const status = await requestClientAccess(slug, cleanEmail)
      if (status === 'rate_limited') {
        setFormError(TOO_MANY)
      } else if (status === 'not_found') {
        setFormError(`Este correo no está cargado por ${trainerName}. Revisá que esté bien escrito o pedile que lo agregue.`)
      } else if (status === 'email_sent') {
        setStep('sent')
      } else {
        goToStep(status)
      }
    } catch (err) {
      console.error('Access request error:', err)
      setFormError('No pudimos procesar el pedido. Intentá de nuevo en unos minutos.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (step === 'create_password') {
      if (password.length < MIN_PASSWORD) {
        setFormError(`La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`)
        return
      }
      if (password !== confirm) {
        setFormError('Las dos contraseñas no coinciden. Escribilas de nuevo.')
        return
      }
    } else if (!password) {
      setFormError('Escribí tu contraseña.')
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      if (step === 'create_password') {
        const status = await createClientPassword(slug, cleanEmail, password, remember)
        if (status === 'password') {
          goToStep('password')
          setFormError('Esta cuenta ya tiene contraseña. Escribila para entrar.')
          return
        }
        if (status === 'rate_limited') {
          setFormError(TOO_MANY)
          return
        }
        if (status === 'not_found') {
          backToEmail()
          setFormError(`Este correo ya no está cargado por ${trainerName}. Pedile que lo agregue.`)
          return
        }
      } else {
        await signInClient(cleanEmail, password, remember)
      }
      saveEmail(cleanEmail, remember)
    } catch (err) {
      console.error('Student sign-in error:', err)
      const wrongPassword = (err as { code?: string }).code === 'invalid_credentials'
      setFormError(
        wrongPassword
          ? 'La contraseña no es correcta. Revisala y probá de nuevo.'
          : 'No pudimos hacerte entrar. Intentá de nuevo en unos minutos.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (claim.data) return <Navigate to="/alumno" replace />

  const isBusy = loading || loadingTrainer || claim.isLoading

  const errorAlert = formError && (
    <div className="auth-alert auth-alert--error" role="alert">
      <AlertCircle size={18} className="auth-alert__icon" />
      <span>{formError}</span>
    </div>
  )

  const submitLabel = (label: string) =>
    submitting ? (
      <span className="auth-btn-spinner" />
    ) : (
      <>
        <span>{label}</span>
        <ArrowRight size={16} />
      </>
    )

  let content: ReactNode
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
        <Link className="auth-submit-btn" to="/vista-alumno">Ver como alumno</Link>
        <Link className="auth-card__desc" to="/admin/dashboard" style={{ textAlign: 'center' }}>Ir a mi panel</Link>
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
  } else if (step === 'sent') {
    content = (
      <>
        <div className="auth-alert auth-alert--success" role="status">
          <CheckCircle2 size={18} className="auth-alert__icon" />
          <span>Por seguridad, a esta cuenta le enviamos un link al correo para entrar.</span>
        </div>
        <p className="auth-card__desc">Revisá también la carpeta de spam.</p>
      </>
    )
  } else if (step === 'create_password' || step === 'password') {
    const creating = step === 'create_password'
    content = (
      <>
        <div className="auth-card__header">
          <h2 className="auth-card__title">{creating ? 'Creá tu contraseña' : 'Escribí tu contraseña'}</h2>
          <p className="auth-card__desc">
            {creating
              ? 'Es tu primera vez. La vas a usar cada vez que entres a tus rutinas.'
              : `Entrás a tus rutinas con ${trainerName}.`}
          </p>
        </div>

        <div className="auth-access-email">
          <span>{cleanEmail}</span>
          <button type="button" className="auth-text-btn" onClick={backToEmail}>
            <ArrowLeft size={14} aria-hidden="true" />
            Cambiar correo
          </button>
        </div>

        {errorAlert}

        <form className="auth-form" onSubmit={handlePassword} noValidate>
          {/* Lets the browser and password managers pair the password with the email */}
          <input type="email" name="email" autoComplete="username" value={cleanEmail} readOnly hidden />

          <div className="auth-field">
            <div className="auth-label-group">
              <label className="auth-label" htmlFor="student-password">Contraseña</label>
              {!creating && (
                <button type="button" className="auth-text-btn" onClick={() => setForgot(open => !open)} aria-expanded={forgot}>
                  ¿La olvidaste?
                </button>
              )}
            </div>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                ref={passwordInput}
                id="student-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={creating ? 'new-password' : 'current-password'}
                className="auth-input"
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  setFormError(null)
                }}
                aria-describedby={creating ? 'student-password-hint' : undefined}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(shown => !shown)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {creating && (
              <span id="student-password-hint" className="auth-field-hint">Al menos {MIN_PASSWORD} caracteres.</span>
            )}
          </div>

          {forgot && (
            <p className="auth-access-forgot" role="status">
              Pedile a {trainerName} que te habilite una contraseña nueva desde su panel. Después entrás con tu
              correo y la creás de nuevo.
            </p>
          )}

          {creating && (
            <div className="auth-field">
              <label className="auth-label" htmlFor="student-password-confirm">Repetí la contraseña</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="student-password-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="auth-input"
                  value={confirm}
                  onChange={e => {
                    setConfirm(e.target.value)
                    setFormError(null)
                  }}
                  required
                />
              </div>
            </div>
          )}

          <label className="auth-remember">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
            <span>
              Recordarme
              <small>Destildalo si el celular o la compu no son tuyos.</small>
            </span>
          </label>

          <button type="submit" className="auth-submit-btn" disabled={submitting}>
            {submitLabel(creating ? 'Crear contraseña y entrar' : 'Entrar')}
          </button>
        </form>
      </>
    )
  } else {
    content = (
      <>
        <div className="auth-card__header">
          <h2 className="auth-card__title">Entrená con {trainerName}</h2>
          <p className="auth-card__desc">Ingresá el correo que le diste a tu entrenador para ver tus rutinas.</p>
        </div>

        {errorAlert}

        <form className="auth-form" onSubmit={handleEmail} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="student-email">Correo electrónico</label>
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
            {submitLabel('Continuar')}
          </button>
        </form>
        <p className="auth-legal">
          Al entrar aceptás los <Link to="/terminos">Términos y condiciones</Link> y la{' '}
          <Link to="/privacidad">Política de privacidad</Link>.
        </p>
      </>
    )
  }

  return (
    <div className="auth-viewport auth-viewport--single">
      <div className="auth-terminal">
        <div className="auth-card"><Link to="/" className="auth-card__mobile-logo" aria-label="TrainerOS, ir al inicio"><Logo /></Link>{content}</div>
      </div>
    </div>
  )
}
