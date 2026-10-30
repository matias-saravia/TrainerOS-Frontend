import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
import { requestPasswordReset } from '../api/auth.api'
import { useAuth } from '../hooks/useAuth'
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

  const [mode, setMode] = useState<AuthMode>('login')
  const [fields, setFields] = useState<FormFields>(INITIAL_FIELDS)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  const locState = location.state as { from?: { pathname?: string } } | null
  const redirectPath = locState?.from?.pathname ?? '/'

  // ── Validation logic ────────────────────────────────────────────────
  const validate = (data: FormFields, currentMode: AuthMode): FormErrors => {
    const errs: FormErrors = {}

    // Email
    if (!data.email.trim()) {
      errs.email = 'El correo electrónico es obligatorio.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errs.email = 'Ingresa un formato de correo válido (ej. entrenador@gym.com).'
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
        errs.nombre = 'Ingresa tu nombre.'
      } else if (data.nombre.trim().length < 2) {
        errs.nombre = 'El nombre debe tener al menos 2 caracteres.'
      }

      // Apellido
      if (!data.apellido.trim()) {
        errs.apellido = 'Ingresa tu apellido.'
      } else if (data.apellido.trim().length < 2) {
        errs.apellido = 'El apellido debe tener al menos 2 caracteres.'
      }

      // Confirm Password
      if (!data.confirmPassword) {
        errs.confirmPassword = 'Debes confirmar la contraseña.'
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
    if (s <= 1) return { text: 'Débil', color: '#ba1a1a' }
    if (s <= 2) return { text: 'Aceptable', color: '#f59e0b' }
    if (s === 3) return { text: 'Buena', color: '#3b82f6' }
    return { text: 'Fuerte', color: '#22c55e' }
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
      setServerError('Por favor completa todos los campos requeridos correctamente.')
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
            '¡Cuenta creada con éxito! Por favor revisa tu bandeja de correo para confirmar tu cuenta antes de ingresar.'
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
        setServerError('Correo o contraseña incorrectos. Verifica tus datos.')
      } else if (rawMsg.includes('User already registered') || rawMsg.includes('already exists')) {
        setServerError('Ya existe un entrenador registrado con este correo.')
      } else if (rawMsg.includes('Password should be at least')) {
        setServerError('La contraseña debe tener al menos 6 caracteres.')
      } else {
        setServerError(rawMsg || 'Ocurrió un error al procesar la solicitud. Intenta nuevamente.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-viewport">
      <div className="auth-container">
        {/* ── LEFT PANEL: Brand Thesis & Athletic Telemetry ────────────── */}
        <div className="auth-showcase">
          <div className="auth-showcase__header">
            <div className="auth-logo-badge">
              <span className="auth-logo-badge__mark">T</span>
            </div>
            <div>
              <span className="auth-logo-badge__title">TrainerOS</span>
              <span className="auth-logo-badge__sub">Coach Operating System</span>
            </div>
          </div>

          <div className="auth-showcase__hero">
            <h1 className="auth-showcase__title">
              Arquitectura para entrenadores de alto rendimiento.
            </h1>
            <p className="auth-showcase__copy">
              Estructura periodizaciones, diseña rutinas hiper-personalizadas y centraliza
              el seguimiento de carga y fuerza con precisión.
            </p>
          </div>

        </div>

        {/* ── RIGHT PANEL: Terminal / Access Card ──────────────────────── */}
        <div className="auth-terminal">
          <div className="auth-card">
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
                {mode === 'login' ? 'Bienvenido a tu panel' : 'Crear cuenta de Coach'}
              </h2>
              <p className="auth-card__desc">
                {mode === 'login'
                  ? 'Ingresa tus credenciales para acceder a tus clientes y rutinas.'
                  : 'Empieza a gestionar tu cartera de atletas en la nube.'}
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
                                : 'rgba(82, 103, 125, 0.2)',
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
                    <span>{mode === 'login' ? 'Entrar al Sistema' : 'Crear Cuenta de Entrenador'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Switch Footer Hint */}
            <div className="auth-footer-prompt">
              {mode === 'login' ? (
                <>
                  ¿Aún no tienes cuenta?{' '}
                  <button
                    type="button"
                    className="auth-text-btn"
                    onClick={() => switchMode('register')}
                  >
                    Regístrate aquí
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
                    Inicia sesión
                  </button>
                </>
              )}
            </div>
            <div className="auth-footer-prompt">
              ¿Sos alumno? Entrá desde el link que te pasó tu entrenador.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
