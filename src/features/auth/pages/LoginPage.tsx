import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { googleSignInEnabled, requestPasswordReset, signInWithGoogle } from '../api/auth.api'
import { useAuth } from '../hooks/useAuth'
import Logo from '../../../components/Logo'
import './LoginPage.css'

type AuthMode = 'login' | 'register'

interface FormFields {
  nombre: string
  apellido: string
  email: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  nombre?: string
  apellido?: string
  email?: string
  password?: string
  confirmPassword?: string
}

const INITIAL_FIELDS: FormFields = {
  nombre: '',
  apellido: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, signUp } = useAuth()

  const [mode, setMode] = useState<AuthMode>(
    new URLSearchParams(location.search).get('modo') === 'registro' ? 'register' : 'login'
  )
  const [fields, setFields] = useState<FormFields>(INITIAL_FIELDS)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const locState = location.state as { from?: { pathname?: string }; oauthError?: boolean } | null
  const redirectPath = locState?.from?.pathname ?? '/'

  const [serverError, setServerError] = useState<string | null>(
    locState?.oauthError ? 'No pudiste entrar con Google. Si cancelaste, probá de nuevo, o entrá con tu correo.' : null
  )
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  // Coming back from Google with the Back button restores this page as it was left: unlock it
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setSubmitting(false)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  // ── Validation logic ────────────────────────────────────────────────
  const validate = (data: FormFields, currentMode: AuthMode): FormErrors => {
    const errs: FormErrors = {}

    // Email
    if (!data.email.trim()) {
      errs.email = 'El correo electrónico es obligatorio.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errs.email = 'Escribí un correo válido, por ejemplo entrenador@gym.com.'
    }

    // Password
    if (!data.password) {
      errs.password = 'La contraseña es obligatoria.'
    } else if (data.password.length < 6) {
      errs.password = 'La contraseña debe tener un mínimo de 6 caracteres.'
    }

    if (currentMode === 'register') {
      // Nombre
      if (!data.nombre.trim()) {
        errs.nombre = 'Escribí tu nombre.'
      } else if (data.nombre.trim().length < 2) {
        errs.nombre = 'El nombre debe tener al menos 2 caracteres.'
      }

      // Apellido
      if (!data.apellido.trim()) {
        errs.apellido = 'Escribí tu apellido.'
      } else if (data.apellido.trim().length < 2) {
        errs.apellido = 'El apellido debe tener al menos 2 caracteres.'
      }

      // Confirm Password
      if (!data.confirmPassword) {
        errs.confirmPassword = 'Confirmá la contraseña.'
      } else if (data.confirmPassword !== data.password) {
        errs.confirmPassword = 'Las contraseñas no coinciden.'
      }
    }

    return errs
  }

  const errors = validate(fields, mode)
  const isFormValid = Object.keys(errors).length === 0

  // ── Password strength calculation ──────────────────────────────────
  const calculatePasswordStrength = (pwd: string) => {
    if (!pwd) return 0
    let score = 0
    if (pwd.length >= 6) score += 1
    if (pwd.length >= 8) score += 1
    if (/[0-9]/.test(pwd)) score += 1
    if (/[A-Z]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1
    return score // 0 - 4
  }

  const pwdStrength = calculatePasswordStrength(fields.password)
  const getStrengthLabel = (s: number) => {
    if (s <= 1) return { text: 'Débil', color: 'var(--color-error)' }
    if (s <= 2) return { text: 'Aceptable', color: 'var(--color-warning)' }
    if (s === 3) return { text: 'Buena', color: 'var(--color-midnight-blue)' }
    return { text: 'Fuerte', color: 'var(--color-success)' }
  }

  // ── Handlers ───────────────────────────────────────────────────────
  const handleChange = (field: keyof FormFields, value: string) => {
    setFields(prev => ({ ...prev, [field]: value }))
    setServerError(null)
    setSuccessNotice(null)
  }

  const handleBlur = (field: keyof FormFields) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setTouched({})
    setServerError(null)
    setSuccessNotice(null)
  }

  const handleForgotPassword = async () => {
    setTouched(prev => ({ ...prev, email: true }))
    if (errors.email) {
      setServerError('Ingresá tu correo para enviarte el link de recuperación.')
      return
    }
    setServerError(null)
    try {
      await requestPasswordReset(fields.email)
      setSuccessNotice('Si el correo está registrado, te enviamos un link para crear una nueva contraseña.')
    } catch (err) {
      console.error('Password reset error:', err)
      setServerError('No pudimos enviar el correo. Intentá de nuevo en unos minutos.')
    }
  }

  const handleGoogle = async () => {
    setServerError(null)
    setSuccessNotice(null)
    setSubmitting(true)
    try {
      await signInWithGoogle()
      // The browser leaves for Google here; it comes back signed in
    } catch (err) {
      console.error('Google sign-in error:', err)
      setServerError('No pudimos conectar con Google. Intentá de nuevo o usá tu correo.')
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Mark all as touched
    const allTouched: Record<string, boolean> = {
      email: true,
      password: true,
      nombre: true,
      apellido: true,
      confirmPassword: true,
    }
    setTouched(allTouched)

    if (!isFormValid) {
      setServerError('Revisá los campos marcados.')
      return
    }

    setSubmitting(true)
    setServerError(null)
    setSuccessNotice(null)

    try {
      if (mode === 'login') {
        await signIn({
          email: fields.email,
          password: fields.password,
        })
        navigate(redirectPath, { replace: true })
      } else {
        const { requiresConfirmation } = await signUp({
          email: fields.email,
          password: fields.password,
          nombre: fields.nombre,
          apellido: fields.apellido,
        })

        if (requiresConfirmation) {
          setSuccessNotice(
            'Cuenta creada. Revisá tu correo y confirmala antes de entrar.'
          )
          setMode('login')
        } else {
          // Auto-logged in!
          navigate(redirectPath, { replace: true })
        }
      }
    } catch (err: unknown) {
      console.error('Auth error:', err)
      const rawMsg = err instanceof Error ? err.message : String(err)
      if (rawMsg.includes('Invalid login credentials')) {
        setServerError('Correo o contraseña incorrectos.')
      } else if (rawMsg.includes('User already registered') || rawMsg.includes('already exists')) {
        setServerError('Ya existe un entrenador registrado con este correo.')
      } else if (rawMsg.includes('Password should be at least')) {
        setServerError('La contraseña debe tener al menos 6 caracteres.')
      } else {
        setServerError(rawMsg || 'Algo salió mal. Intentá de nuevo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-viewport">
      <>
        <aside className="auth-showcase">
          <Link to="/" className="auth-home" aria-label="TrainerOS, ir al inicio"><Logo /></Link>

          <div>
            <h1 className="auth-showcase__title">Lo que armás es lo que entrenan.</h1>
            <p className="auth-showcase__copy">
              Cargá a tus alumnos, armá sus rutinas y seguí cada serie que registran desde el celular. Gratis.
            </p>
          </div>

          <figure className="auth-sample" aria-hidden="true">
            <figcaption className="auth-sample__caption">Ejemplo: sentadilla, 4 series de 8</figcaption>
            <table>
              <thead>
                <tr><th>Serie</th><th>Reps</th><th>Carga</th></tr>
              </thead>
              <tbody>
                <tr><td>1</td><td>8</td><td>60 kg</td></tr>
                <tr><td>2</td><td>8</td><td>65 kg</td></tr>
                <tr className="marker"><td>3</td><td>8</td><td>65 kg</td></tr>
                <tr><td className="auth-sample__blank">4</td><td className="auth-sample__blank">8</td><td className="auth-sample__blank">—</td></tr>
              </tbody>
            </table>
          </figure>
        </aside>

        {/* ── RIGHT PANEL: Terminal / Access Card ──────────────────────── */}
        <div className="auth-terminal">
          <div className="auth-card">
            <Link to="/" className="auth-card__mobile-logo" aria-label="TrainerOS, ir al inicio"><Logo /></Link>
            {/* Segmented Mode Switcher */}
            <div className="auth-switcher">
              <button
                type="button"
                className={`auth-switcher__btn ${mode === 'login' ? 'auth-switcher__btn--active' : ''}`}
                onClick={() => switchMode('login')}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                className={`auth-switcher__btn ${mode === 'register' ? 'auth-switcher__btn--active' : ''}`}
                onClick={() => switchMode('register')}
              >
                Registrar Entrenador
              </button>
            </div>

            {/* Title */}
            <div className="auth-card__header">
              <h2 className="auth-card__title">
                {mode === 'login' ? 'Entrá a tu panel' : 'Creá tu cuenta'}
              </h2>
              <p className="auth-card__desc">
                {mode === 'login'
                  ? 'Tus alumnos y rutinas te esperan.'
                  : 'Es gratis y empezás a cargar alumnos enseguida.'}
              </p>
            </div>

            {/* Alert / Notices */}
            {serverError && (
              <div className="auth-alert auth-alert--error" role="alert">
                <AlertCircle size={18} className="auth-alert__icon" />
                <span>{serverError}</span>
              </div>
            )}

            {successNotice && (
              <div className="auth-alert auth-alert--success" role="status">
                <CheckCircle2 size={18} className="auth-alert__icon" />
                <span>{successNotice}</span>
              </div>
            )}

            {googleSignInEnabled && (
              <>
                <button type="button" className="auth-google-btn" onClick={handleGoogle} disabled={submitting}>
                  <GoogleMark />
                  {mode === 'login' ? 'Entrar con Google' : 'Registrarme con Google'}
                </button>
                <p className="auth-divider"><span>o con tu correo</span></p>
              </>
            )}

            {/* Form */}
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {mode === 'register' && (
                <div className="auth-form__row">
                  {/* Nombre */}
                  <div className="auth-field">
                    <label className="auth-label" htmlFor="nombre">Nombre</label>
                    <div className={`auth-input-wrap ${touched.nombre && errors.nombre ? 'auth-input-wrap--error' : ''} ${touched.nombre && !errors.nombre ? 'auth-input-wrap--valid' : ''}`}>
                      <User size={16} className="auth-input-icon" />
                      <input
                        id="nombre"
                        type="text"
                        placeholder="Ej. Juan"
                        className="auth-input"
                        value={fields.nombre}
                        onChange={e => handleChange('nombre', e.target.value)}
                        onBlur={() => handleBlur('nombre')}
                        required
                      />
                      {touched.nombre && !errors.nombre && fields.nombre && (
                        <CheckCircle2 size={16} className="auth-valid-check" />
                      )}
                    </div>
                    {touched.nombre && errors.nombre && (
                      <span className="auth-field-error">{errors.nombre}</span>
                    )}
                  </div>

                  {/* Apellido */}
                  <div className="auth-field">
                    <label className="auth-label" htmlFor="apellido">Apellido</label>
                    <div className={`auth-input-wrap ${touched.apellido && errors.apellido ? 'auth-input-wrap--error' : ''} ${touched.apellido && !errors.apellido ? 'auth-input-wrap--valid' : ''}`}>
                      <User size={16} className="auth-input-icon" />
                      <input
                        id="apellido"
                        type="text"
                        placeholder="Ej. Pérez"
                        className="auth-input"
                        value={fields.apellido}
                        onChange={e => handleChange('apellido', e.target.value)}
                        onBlur={() => handleBlur('apellido')}
                        required
                      />
                      {touched.apellido && !errors.apellido && fields.apellido && (
                        <CheckCircle2 size={16} className="auth-valid-check" />
                      )}
                    </div>
                    {touched.apellido && errors.apellido && (
                      <span className="auth-field-error">{errors.apellido}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="auth-field">
                <label className="auth-label" htmlFor="email">Correo Electrónico</label>
                <div className={`auth-input-wrap ${touched.email && errors.email ? 'auth-input-wrap--error' : ''} ${touched.email && !errors.email ? 'auth-input-wrap--valid' : ''}`}>
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="entrenador@ejemplo.com"
                    className="auth-input"
                    value={fields.email}
                    onChange={e => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    required
                  />
                  {touched.email && !errors.email && fields.email && (
                    <CheckCircle2 size={16} className="auth-valid-check" />
                  )}
                </div>
                {touched.email && errors.email && (
                  <span className="auth-field-error">{errors.email}</span>
                )}
              </div>

              {/* Password */}
              <div className="auth-field">
                <div className="auth-label-group">
                  <label className="auth-label" htmlFor="password">Contraseña</label>
                  {mode === 'login' && (
                    <button type="button" className="auth-text-btn" onClick={handleForgotPassword}>
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className={`auth-input-wrap ${touched.password && errors.password ? 'auth-input-wrap--error' : ''} ${touched.password && !errors.password ? 'auth-input-wrap--valid' : ''}`}>
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    className="auth-input"
                    value={fields.password}
                    onChange={e => handleChange('password', e.target.value)}
                    onBlur={() => handleBlur('password')}
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <span className="auth-field-error">{errors.password}</span>
                )}

                {/* Password Strength Meter (On register) */}
                {mode === 'register' && fields.password && (
                  <div className="auth-strength-meter">
                    <div className="auth-strength-meter__bars">
                      {[1, 2, 3, 4].map(idx => (
                        <div
                          key={idx}
                          className="auth-strength-meter__bar"
                          style={{
                            background:
                              idx <= pwdStrength
                                ? getStrengthLabel(pwdStrength).color
                                : 'var(--color-ivory)',
                          }}
                        />
                      ))}
                    </div>
                    <span
                      className="auth-strength-meter__label"
                      style={{ color: getStrengthLabel(pwdStrength).color }}
                    >
                      Seguridad: {getStrengthLabel(pwdStrength).text}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password (On register) */}
              {mode === 'register' && (
                <div className="auth-field">
                  <label className="auth-label" htmlFor="confirmPassword">Confirmar Contraseña</label>
                  <div className={`auth-input-wrap ${touched.confirmPassword && errors.confirmPassword ? 'auth-input-wrap--error' : ''} ${touched.confirmPassword && !errors.confirmPassword ? 'auth-input-wrap--valid' : ''}`}>
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="auth-input"
                      value={fields.confirmPassword}
                      onChange={e => handleChange('confirmPassword', e.target.value)}
                      onBlur={() => handleBlur('confirmPassword')}
                      required
                    />
                    {touched.confirmPassword && !errors.confirmPassword && fields.confirmPassword && (
                      <CheckCircle2 size={16} className="auth-valid-check" />
                    )}
                  </div>
                  {touched.confirmPassword && errors.confirmPassword && (
                    <span className="auth-field-error">{errors.confirmPassword}</span>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="auth-btn-spinner" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Entrar' : 'Crear Cuenta de Entrenador'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Switch Footer Hint */}
            <div className="auth-footer-prompt">
              {mode === 'login' ? (
                <>
                  ¿No tenés cuenta?{' '}
                  <button
                    type="button"
                    className="auth-text-btn"
                    onClick={() => switchMode('register')}
                  >
                    Registrate
                  </button>
                </>
              ) : (
                <>
                  ¿Ya estás registrado?{' '}
                  <button
                    type="button"
                    className="auth-text-btn"
                    onClick={() => switchMode('login')}
                  >
                    Iniciá sesión
                  </button>
                </>
              )}
            </div>
            <div className="auth-footer-prompt">
              ¿Sos alumno? Entrá desde el link que te pasó tu entrenador.
            </div>
            <p className="auth-legal">
              Al crear una cuenta aceptás los <Link to="/terminos">Términos y condiciones</Link> y la{' '}
              <Link to="/privacidad">Política de privacidad</Link>.
            </p>
          </div>
        </div>
      </>
    </div>
  )
}

/** Google's own "G", which its sign-in guidelines ask for on the button */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
