import { useState, type FormEvent, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Video, AlertCircle } from 'lucide-react'
import { MUSCLE_GROUPS, type MuscleGroup, type Difficulty } from '../api/exercises.api'
import { useCreateExercise, useExercise, useUpdateExercise } from '../hooks/useExercises'
import { useAuth } from '../../auth'
import ClientPreview from '../components/ClientPreview'
import './NuevoEjercicioPage.css'

type FormState = {
  nombre: string
  grupoMuscular: MuscleGroup | ''
  dificultad: Difficulty
  instrucciones: string
  videoUrl: string
}

type FormErrors = {
  nombre?: string
  grupoMuscular?: string
  instrucciones?: string
}

const INITIAL: FormState = {
  nombre: '',
  grupoMuscular: '',
  dificultad: 'Intermedio',
  instrucciones: '',
  videoUrl: '',
}

const DIFFICULTIES: Difficulty[] = ['Principiante', 'Intermedio', 'Avanzado']

export default function NuevoEjercicioPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { id } = useParams()
  const createExercise = useCreateExercise()
  const updateExercise = useUpdateExercise()
  const { data: existingExercise } = useExercise(id ?? '')
  const isSaving = createExercise.isPending || updateExercise.isPending
  const pageTitle = id ? 'Editar Ejercicio' : 'Nuevo Ejercicio'
  const [form, setForm] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Pre-fill the form when editing an existing exercise
  useEffect(() => {
    if (!existingExercise) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      nombre: existingExercise.nombre,
      grupoMuscular: existingExercise.grupo_muscular,
      dificultad: existingExercise.dificultad,
      instrucciones: existingExercise.instrucciones.join('\n'),
      videoUrl: existingExercise.video_url ?? '',
    })
  }, [existingExercise])

  const validate = (state: FormState): FormErrors => {
    const errs: FormErrors = {}
    if (!state.nombre.trim()) {
      errs.nombre = 'El nombre del ejercicio es obligatorio.'
    } else if (state.nombre.trim().length < 3) {
      errs.nombre = 'El nombre debe tener al menos 3 caracteres.'
    }

    if (!state.grupoMuscular) {
      errs.grupoMuscular = 'Debes seleccionar un grupo muscular principal.'
    }

    if (!state.instrucciones.trim()) {
      errs.instrucciones = 'Añade al menos una instrucción para el alumno.'
    }

    return errs
  }

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm(prev => {
      const updated = { ...prev, [key]: val }
      if (touched[key]) {
        setErrors(validate(updated))
      }
      return updated
    })
    setSubmitError(null)
  }

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    setErrors(validate(form))
  }

  // Build preview data
  const previewInstructions = form.instrucciones
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const validationErrors = validate(form)
    setErrors(validationErrors)
    setTouched({ nombre: true, grupoMuscular: true, instrucciones: true })

    if (Object.keys(validationErrors).length > 0) {
      setSubmitError('Por favor revisa los campos requeridos.')
      return
    }

    if (!user) {
      setSubmitError('Debes haber iniciado sesión para crear un ejercicio.')
      return
    }

    try {
      const exerciseData = {
        nombre: form.nombre.trim(),
        grupo_muscular: form.grupoMuscular as MuscleGroup,
        dificultad: form.dificultad as Difficulty,
        instrucciones: previewInstructions,
        video_url: form.videoUrl.trim() || null,
      }
      if (id) {
        await updateExercise.mutateAsync({ id, data: exerciseData })
      } else {
        await createExercise.mutateAsync({
          ...exerciseData,
          grupos_secundarios: [],
          series_default: null,
          duracion_estimada: null,
          trainer_id: user.id, // Strictly private to this trainer
        })
      }
      navigate('/admin/entrenamientos/ejercicios')
    } catch (err: unknown) {
      console.error('Error creating exercise:', err)
      const message = err instanceof Error ? err.message : String(err)
      setSubmitError(message || 'Error al guardar el ejercicio en Supabase.')
    }
  }

  // Scroll to top on mount
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="nuevo-ejercicio-page">

      {/* ── Mobile Header ── */}
      <div className="nuevo-ejercicio__mobile-header">
        <button
          className="nuevo-ejercicio__back-btn"
          onClick={() => navigate(-1)}
          aria-label="Volver"
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <h1 className="nuevo-ejercicio__mobile-title">{pageTitle}</h1>
        <div style={{ width: 36 }} />
      </div>

      {/* ── Desktop Header ── */}
      <div className="nuevo-ejercicio__desktop-header">
        <div className="nuevo-ejercicio__desktop-header-left">
          <button
            className="nuevo-ejercicio__back-link"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            Banco de Ejercicios
          </button>
          <h1 className="nuevo-ejercicio__title">{pageTitle}</h1>
          <p className="nuevo-ejercicio__subtitle">
            Añade un nuevo movimiento a tu base de datos de ejercicios.
          </p>
        </div>
        <button
          id="btn-guardar-ejercicio-desktop"
          className="btn-primary nuevo-ejercicio__save-btn"
          onClick={handleSubmit}
          disabled={isSaving}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          {isSaving ? 'Guardando...' : 'Guardar Ejercicio'}
        </button>
      </div>

      {submitError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '12px 24px',
          borderRadius: '8px',
          margin: '0 24px 16px 24px',
          fontSize: '13.5px',
          fontWeight: 500,
        }}>
          <AlertCircle size={18} />
          <span>{submitError}</span>
        </div>
      )}

      {/* ── Body ── */}
      <form
        className="nuevo-ejercicio__body"
        onSubmit={handleSubmit}
        id="form-nuevo-ejercicio"
        noValidate
      >

        {/* LEFT COLUMN */}
        <div className="nuevo-ejercicio__left">

          {/* Detalles del Ejercicio */}
          <div className="ne-section">
            <div className="ne-section__heading">
              <FileText size={16} strokeWidth={1.5} className="ne-section__icon" />
              <h2 className="ne-section__title">Detalles del Ejercicio</h2>
            </div>

            <div className="ne-field">
              <label htmlFor="ne-nombre" className="ne-label">
                Nombre del Ejercicio *
              </label>
              <input
                id="ne-nombre"
                className={`ne-input ${errors.nombre && touched.nombre ? 'ne-input--error' : ''}`}
                type="text"
                placeholder="Ej. Sentadilla Frontal con Barra"
                value={form.nombre}
                onChange={e => set('nombre', e.target.value)}
                onBlur={() => handleBlur('nombre')}
                required
                autoComplete="off"
              />
              {errors.nombre && touched.nombre && (
                <span style={{ fontSize: '11.5px', color: 'var(--color-error)', marginTop: '4px' }}>
                  {errors.nombre}
                </span>
              )}
            </div>

            <div className="ne-row">
              <div className="ne-field">
                <label htmlFor="ne-grupo" className="ne-label">
                  Grupo Muscular Principal *
                </label>
                <select
                  id="ne-grupo"
                  className={`ne-input ${errors.grupoMuscular && touched.grupoMuscular ? 'ne-input--error' : ''}`}
                  value={form.grupoMuscular}
                  onChange={e => set('grupoMuscular', e.target.value as MuscleGroup)}
                  onBlur={() => handleBlur('grupoMuscular')}
                  required
                >
                  <option value="" disabled>Seleccionar…</option>
                  {MUSCLE_GROUPS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                {errors.grupoMuscular && touched.grupoMuscular && (
                  <span style={{ fontSize: '11.5px', color: 'var(--color-error)', marginTop: '4px' }}>
                    {errors.grupoMuscular}
                  </span>
                )}
              </div>

              <div className="ne-field">
                <label className="ne-label">Nivel de Dificultad</label>
                {/* Desktop: select */}
                <select
                  id="ne-dificultad-select"
                  className="ne-input ne-difficulty-select"
                  value={form.dificultad}
                  onChange={e => set('dificultad', e.target.value as Difficulty)}
                >
                  {DIFFICULTIES.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {/* Mobile: segmented control */}
                <div className="ne-segmented" role="group" aria-label="Nivel de dificultad">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d}
                      type="button"
                      className={`ne-segmented__btn${form.dificultad === d ? ' ne-segmented__btn--active' : ''}`}
                      onClick={() => set('dificultad', d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="ne-field">
              <label htmlFor="ne-instrucciones" className="ne-label">
                Instrucciones de Ejecución *
                <span className="ne-label-hint">(una por línea)</span>
              </label>
              <textarea
                id="ne-instrucciones"
                className={`ne-input ne-textarea ${errors.instrucciones && touched.instrucciones ? 'ne-input--error' : ''}`}
                placeholder={`Describe los puntos clave para una técnica perfecta…\n\nEj.\nMantén los codos altos y el pecho erguido durante todo el movimiento.\nDesciende hasta que los muslos estén paralelos al suelo.`}
                value={form.instrucciones}
                onChange={e => set('instrucciones', e.target.value)}
                onBlur={() => handleBlur('instrucciones')}
                rows={5}
                required
              />
              {errors.instrucciones && touched.instrucciones && (
                <span style={{ fontSize: '11.5px', color: 'var(--color-error)', marginTop: '4px' }}>
                  {errors.instrucciones}
                </span>
              )}
            </div>
          </div>

          {/* Multimedia */}
          <div className="ne-section">
            <div className="ne-section__heading">
              <Video size={16} strokeWidth={1.5} className="ne-section__icon" />
              <h2 className="ne-section__title">Multimedia</h2>
            </div>

            <div className="ne-field">
              <label htmlFor="ne-video" className="ne-label">
                URL de Video (YouTube/Vimeo)
              </label>
              <div className="ne-url-wrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="ne-url-icon">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                <input
                  id="ne-video"
                  className="ne-input ne-url-input"
                  type="url"
                  placeholder="https://youtube.com/watch?v=…"
                  value={form.videoUrl}
                  onChange={e => set('videoUrl', e.target.value)}
                />
              </div>
              <p className="ne-hint">
                Proporciona un enlace directo para mostrarlo en la app del cliente.
              </p>
            </div>
          </div>

          {/* Mobile preview (inline) */}
          <div className="ne-mobile-preview">
            <ClientPreview
              exercise={{
                nombre: form.nombre || undefined,
                grupoMuscular: form.grupoMuscular || undefined,
                dificultad: form.dificultad,
                instrucciones: previewInstructions,
                videoUrl: form.videoUrl || undefined,
                duracionEstimada: 45,
                series: 4,
              }}
            />
          </div>

        </div>

        {/* RIGHT COLUMN (desktop only) */}
        <div className="nuevo-ejercicio__right">
          <ClientPreview
            exercise={{
              nombre: form.nombre || undefined,
              grupoMuscular: form.grupoMuscular || undefined,
              dificultad: form.dificultad,
              instrucciones: previewInstructions,
              videoUrl: form.videoUrl || undefined,
              duracionEstimada: 45,
              series: 4,
            }}
          />
        </div>

      </form>

      {/* ── Mobile Save Button ── */}
      <div className="nuevo-ejercicio__mobile-footer">
        <button
          id="btn-guardar-ejercicio-mobile"
          className="btn-primary nuevo-ejercicio__mobile-save"
          form="form-nuevo-ejercicio"
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? 'Guardando...' : 'Guardar Ejercicio'}
        </button>
      </div>

    </div>
  )
}
