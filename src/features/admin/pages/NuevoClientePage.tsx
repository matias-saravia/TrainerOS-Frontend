import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { User, CreditCard, Activity, Flag, AlertCircle, ArrowLeft, Trash2, Dumbbell, Link2, X, Plus } from 'lucide-react'
import { useCreateClient, useUpdateClient, useDeleteClient, useClient } from '../hooks/useClients'
import { useClientRoutines, useUnassignRoutine } from '../hooks/useClientRoutines'
import { useAuth } from '../../auth'
import ConfirmModal from '../../../components/ConfirmModal'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import ErrorState from '../../../components/ErrorState'
import AssignRoutineModal from '../components/AssignRoutineModal'
import { getTrainerLink } from '../../../utils/trainerLink'
import './NuevoClientePage.css'

interface FormState {
  nombre: string
  email: string
  telefono: string
  fechaNacimiento: string
  tipoPlan: 'basico' | 'estandar' | 'premium' | 'personalizado'
  fechaInicio: string
  estadoPago: 'pagado' | 'pendiente'
  peso: string
  altura: string
  grasaCorporal: string
  experiencia: 'principiante' | 'intermedio' | 'avanzado'
  objetivo: string
  historialMedico: string
  consideraciones: string
}

interface FormErrors {
  nombre?: string
  email?: string
  telefono?: string
  peso?: string
  altura?: string
  grasaCorporal?: string
}

const INITIAL: FormState = {
  nombre: '',
  email: '',
  telefono: '',
  fechaNacimiento: '',
  tipoPlan: 'basico',
  fechaInicio: '',
  estadoPago: 'pagado',
  peso: '',
  altura: '',
  grasaCorporal: '',
  experiencia: 'principiante',
  objetivo: '',
  historialMedico: '',
  consideraciones: '',
}

export default function NuevoClientePage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)
  const { user, profile } = useAuth()

  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const deleteClient = useDeleteClient()
  const { data: existingClient, isLoading: isLoadingClient, error: clientFetchError } = useClient(id ?? '')

  const [form, setForm] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const { data: assignedRoutines = [], isLoading: loadingAssigned } = useClientRoutines(id ?? '')
  const unassignRoutine = useUnassignRoutine()

  const clientLink = getTrainerLink(profile?.slug)

  const handleCopyLink = () => {
    if (!clientLink) return
    navigator.clipboard.writeText(clientLink).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  const handleUnassign = async (routineId: string) => {
    if (!id) return
    try {
      await unassignRoutine.mutateAsync({ clientId: id, routineId })
    } catch (err) {
      console.error('Error unassigning routine:', err)
    }
  }

  // Pre-fill form when editing an existing client
  useEffect(() => {
    if (existingClient) {
      const fullName = [existingClient.nombre, existingClient.apellido].filter(Boolean).join(' ')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        nombre: fullName,
        email: existingClient.email || '',
        telefono: existingClient.telefono || '',
        fechaNacimiento: existingClient.fecha_nacimiento || '',
        tipoPlan: (existingClient.plan_tier as FormState['tipoPlan']) || 'basico',
        fechaInicio: existingClient.fecha_inicio || '',
        estadoPago: (existingClient.estado_pago as FormState['estadoPago']) || 'pagado',
        peso: existingClient.peso_inicial != null ? String(existingClient.peso_inicial) : '',
        altura: existingClient.altura != null ? String(existingClient.altura) : '',
        grasaCorporal: existingClient.grasa_corporal != null ? String(existingClient.grasa_corporal) : '',
        experiencia: (existingClient.experiencia?.toLowerCase() as FormState['experiencia']) || 'principiante',
        objetivo: existingClient.objetivo || '',
        historialMedico: existingClient.historial_medico || '',
        consideraciones: existingClient.consideraciones || '',
      })
    }
  }, [existingClient])

  const isSubmitting = createClient.isPending || updateClient.isPending

  const validate = (state: FormState): FormErrors => {
    const errs: FormErrors = {}

    if (!state.nombre.trim()) {
      errs.nombre = 'El nombre completo es obligatorio.'
    } else if (state.nombre.trim().length < 3) {
      errs.nombre = 'Ingresa al menos 3 caracteres.'
    }

    if (!state.email.trim()) {
      errs.email = 'El correo electrónico es obligatorio.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())) {
      errs.email = 'Ingresa un formato de correo válido (ej. alumno@email.com).'
    }

    if (state.telefono.trim() && !/^[+0-9\s-]{6,20}$/.test(state.telefono.trim())) {
      errs.telefono = 'Ingresa un número de teléfono válido (mínimo 6 dígitos).'
    }

    if (state.peso) {
      const p = parseFloat(state.peso)
      if (isNaN(p) || p <= 20 || p >= 350) {
        errs.peso = 'Ingresa un peso válido entre 20 y 350 kg.'
      }
    }

    if (state.altura) {
      const a = parseFloat(state.altura)
      if (isNaN(a) || a <= 80 || a >= 250) {
        errs.altura = 'Ingresa una altura válida entre 80 y 250 cm.'
      }
    }

    if (state.grasaCorporal) {
      const g = parseFloat(state.grasaCorporal)
      if (isNaN(g) || g < 2 || g > 60) {
        errs.grasaCorporal = 'El % de grasa debe estar entre 2 y 60%.'
      }
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

  const handleBlur = (key: string) => {
    setTouched(prev => ({ ...prev, [key]: true }))
    setErrors(validate(form))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const validationErrors = validate(form)
    setErrors(validationErrors)
    setTouched({
      nombre: true,
      email: true,
      telefono: true,
      peso: true,
      altura: true,
      grasaCorporal: true,
    })

    if (Object.keys(validationErrors).length > 0) {
      setSubmitError('Por favor revisa los campos señalados antes de guardar.')
      return
    }

    if (!user) {
      setSubmitError('Debes haber iniciado sesión como entrenador para registrar o editar un cliente.')
      return
    }

    const expMapping: Record<string, 'Principiante' | 'Intermedio' | 'Avanzado'> = {
      principiante: 'Principiante',
      intermedio: 'Intermedio',
      avanzado: 'Avanzado',
    }

    const clientPayload = {
      nombre: form.nombre.trim().split(' ')[0] || form.nombre.trim(),
      apellido: form.nombre.trim().split(' ').slice(1).join(' ') || '',
      email: form.email.trim().toLowerCase(),
      telefono: form.telefono.trim() || null,
      fecha_nacimiento: form.fechaNacimiento || null,
      plan_tier: form.tipoPlan,
      fecha_inicio: form.fechaInicio || new Date().toISOString().split('T')[0],
      estado_pago: form.estadoPago,
      peso_inicial: form.peso ? parseFloat(form.peso) : null,
      altura: form.altura ? parseFloat(form.altura) : null,
      grasa_corporal: form.grasaCorporal ? parseFloat(form.grasaCorporal) : null,
      experiencia: expMapping[form.experiencia] ?? 'Principiante',
      objetivo: form.objetivo.trim() || null,
      historial_medico: form.historialMedico.trim() || null,
      consideraciones: form.consideraciones.trim() || null,
    }

    try {
      if (isEdit && id) {
        await updateClient.mutateAsync({
          id,
          data: clientPayload,
        })
      } else {
        await createClient.mutateAsync({
          ...clientPayload,
          trainer_id: user.id, // Authenticated trainer ID
        })
      }
      navigate('/admin/clientes')
    } catch (err: unknown) {
      console.error(isEdit ? 'Error updating client:' : 'Error creating client:', err)
      const message = (err as { message?: string })?.message ?? String(err)
      if (message.includes('idx_clients_trainer_email')) {
        setSubmitError('Ya tenés un cliente con ese correo electrónico.')
        return
      }
      setSubmitError(message || `Error al ${isEdit ? 'actualizar' : 'guardar'} el cliente en Supabase.`)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteClient.mutateAsync(id)
      navigate('/admin/clientes')
    } catch (err: unknown) {
      console.error('Error deleting client:', err)
      const message = err instanceof Error ? err.message : String(err)
      setSubmitError(message || 'Error al eliminar el cliente.')
      setShowDeleteModal(false)
    }
  }

  if (isEdit && isLoadingClient) {
    return (
      <div className="nuevo-cliente-page">
        <div className="page-header page-header--border">
          <h1 className="page-header__title">Cargando Cliente...</h1>
        </div>
        <div style={{ padding: '24px' }}>
          <LoadingSkeleton count={4} variant="card" />
        </div>
      </div>
    )
  }

  if (isEdit && clientFetchError) {
    return (
      <div className="nuevo-cliente-page">
        <div className="page-header page-header--border">
          <h1 className="page-header__title">Editar Cliente</h1>
        </div>
        <div style={{ padding: '24px' }}>
          <ErrorState
            message={clientFetchError.message || 'No se pudo cargar la información del cliente.'}
            onRetry={() => navigate('/admin/clientes')}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="nuevo-cliente-page">
      {/* Header */}
      <div className="page-header page-header--border" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="icon-action-btn"
            title="Volver"
            onClick={() => navigate('/admin/clientes')}
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="page-header__title">
              {isEdit ? 'Editar Cliente' : 'Añadir Nuevo Cliente'}
            </h1>
            {isEdit && existingClient && (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-dusty-blue)' }}>
                {existingClient.nombre} {existingClient.apellido}
              </p>
            )}
          </div>
        </div>

        {isEdit && (
          <button
            type="button"
            className="btn-danger-outline"
            onClick={() => setShowDeleteModal(true)}
            disabled={isSubmitting || deleteClient.isPending}
          >
            <Trash2 size={16} strokeWidth={1.5} />
            Eliminar Cliente
          </button>
        )}
      </div>

      {submitError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '8px',
          margin: '16px 24px 0 24px',
          fontSize: '13.5px',
          fontWeight: 500,
        }}>
          <AlertCircle size={18} />
          <span>{submitError}</span>
        </div>
      )}

      <form className="nuevo-cliente-form" onSubmit={handleSubmit} noValidate>

        {/* ── Información Personal ── */}
        <div className="form-section">
          <div className="form-section__heading">
            <User size={18} strokeWidth={1.5} className="form-section__icon" />
            <h2 className="form-section__title">Información Personal</h2>
          </div>
          <div className="form-grid form-grid--2">
            <div className="form-field">
              <label className="form-label" htmlFor="nombre">Nombre Completo *</label>
              <input
                id="nombre"
                className={`form-input ${errors.nombre && touched.nombre ? 'form-input--error' : ''}`}
                type="text"
                placeholder="Ej. Juan Pérez"
                value={form.nombre}
                onChange={e => set('nombre', e.target.value)}
                onBlur={() => handleBlur('nombre')}
                required
              />
              {errors.nombre && touched.nombre && (
                <span style={{ fontSize: '11.5px', color: 'var(--color-error)', marginTop: '4px' }}>
                  {errors.nombre}
                </span>
              )}
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="email">Correo Electrónico *</label>
              <input
                id="email"
                className={`form-input ${errors.email && touched.email ? 'form-input--error' : ''}`}
                type="email"
                placeholder="juan@ejemplo.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                required
              />
              {errors.email && touched.email && (
                <span style={{ fontSize: '11.5px', color: 'var(--color-error)', marginTop: '4px' }}>
                  {errors.email}
                </span>
              )}
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="telefono">Teléfono</label>
              <input
                id="telefono"
                className={`form-input ${errors.telefono && touched.telefono ? 'form-input--error' : ''}`}
                type="tel"
                placeholder="+54 9 11 1234-5678"
                value={form.telefono}
                onChange={e => set('telefono', e.target.value)}
                onBlur={() => handleBlur('telefono')}
              />
              {errors.telefono && touched.telefono && (
                <span style={{ fontSize: '11.5px', color: 'var(--color-error)', marginTop: '4px' }}>
                  {errors.telefono}
                </span>
              )}
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="fechaNacimiento">Fecha de Nacimiento</label>
              <input
                id="fechaNacimiento"
                className="form-input"
                type="date"
                value={form.fechaNacimiento}
                onChange={e => set('fechaNacimiento', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Suscripción ── */}
        <div className="form-section">
          <div className="form-section__heading">
            <CreditCard size={18} strokeWidth={1.5} className="form-section__icon" />
            <h2 className="form-section__title">Suscripción</h2>
          </div>
          <div className="form-grid form-grid--1">
            <div className="form-field">
              <label className="form-label" htmlFor="tipoPlan">Tipo de Plan</label>
              <select
                id="tipoPlan"
                className="form-input"
                value={form.tipoPlan}
                onChange={e => set('tipoPlan', e.target.value as FormState['tipoPlan'])}
              >
                <option value="basico">Básico (1 vez/semana)</option>
                <option value="estandar">Estándar (3 veces/semana)</option>
                <option value="premium">Premium (5 veces/semana)</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="fechaInicio">Fecha de Inicio</label>
              <input
                id="fechaInicio"
                className="form-input"
                type="date"
                value={form.fechaInicio}
                onChange={e => set('fechaInicio', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Estado de Pago</label>
              <div className="radio-group">
                {(['pagado', 'pendiente'] as const).map(v => (
                  <label key={v} className="radio-label">
                    <input
                      type="radio"
                      name="estadoPago"
                      value={v}
                      checked={form.estadoPago === v}
                      onChange={() => set('estadoPago', v)}
                    />
                    <span className="radio-custom" />
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom two-col sections */}
        <div className="form-two-col">

          {/* ── Perfil Físico ── */}
          <div className="form-section">
            <div className="form-section__heading">
              <Activity size={18} strokeWidth={1.5} className="form-section__icon" />
              <h2 className="form-section__title">Perfil Físico</h2>
            </div>
            <div className="form-grid form-grid--2">
              <div className="form-field">
                <label className="form-label" htmlFor="peso">Peso (kg)</label>
                <input
                  id="peso"
                  className={`form-input ${errors.peso && touched.peso ? 'form-input--error' : ''}`}
                  type="number"
                  step="0.1"
                  placeholder="75.5"
                  value={form.peso}
                  onChange={e => set('peso', e.target.value)}
                  onBlur={() => handleBlur('peso')}
                />
                {errors.peso && touched.peso && (
                  <span style={{ fontSize: '11.5px', color: 'var(--color-error)', marginTop: '4px' }}>
                    {errors.peso}
                  </span>
                )}
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="altura">Altura (cm)</label>
                <input
                  id="altura"
                  className={`form-input ${errors.altura && touched.altura ? 'form-input--error' : ''}`}
                  type="number"
                  placeholder="175"
                  value={form.altura}
                  onChange={e => set('altura', e.target.value)}
                  onBlur={() => handleBlur('altura')}
                />
                {errors.altura && touched.altura && (
                  <span style={{ fontSize: '11.5px', color: 'var(--color-error)', marginTop: '4px' }}>
                    {errors.altura}
                  </span>
                )}
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="grasa">% Grasa Corporal</label>
                <input
                  id="grasa"
                  className={`form-input ${errors.grasaCorporal && touched.grasaCorporal ? 'form-input--error' : ''}`}
                  type="number"
                  step="0.1"
                  placeholder="15.0"
                  value={form.grasaCorporal}
                  onChange={e => set('grasaCorporal', e.target.value)}
                  onBlur={() => handleBlur('grasaCorporal')}
                />
                {errors.grasaCorporal && touched.grasaCorporal && (
                  <span style={{ fontSize: '11.5px', color: 'var(--color-error)', marginTop: '4px' }}>
                    {errors.grasaCorporal}
                  </span>
                )}
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="experiencia">Exp. de Entrenamiento</label>
                <select
                  id="experiencia"
                  className="form-input"
                  value={form.experiencia}
                  onChange={e => set('experiencia', e.target.value as FormState['experiencia'])}
                >
                  <option value="principiante">Principiante</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Objetivos y Notas ── */}
          <div className="form-section">
            <div className="form-section__heading">
              <Flag size={18} strokeWidth={1.5} className="form-section__icon" />
              <h2 className="form-section__title">Objetivos y Notas</h2>
            </div>
            <div className="form-grid form-grid--1">
              <div className="form-field">
                <label className="form-label" htmlFor="objetivo">Objetivo Principal</label>
                <input
                  id="objetivo"
                  className="form-input"
                  type="text"
                  placeholder="Ej. Hipertrofia, Pérdida de peso"
                  value={form.objetivo}
                  onChange={e => set('objetivo', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="historialMedico">Historial Médico / Lesiones</label>
                <textarea
                  id="historialMedico"
                  className="form-input form-textarea"
                  placeholder="Alergias, cirugías previas, molestias crónicas..."
                  value={form.historialMedico}
                  onChange={e => set('historialMedico', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="consideraciones">Consideraciones Especiales</label>
                <textarea
                  id="consideraciones"
                  className="form-input form-textarea"
                  placeholder="Disponibilidad, preferencias de material..."
                  value={form.consideraciones}
                  onChange={e => set('consideraciones', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className={`form-footer ${isEdit ? 'form-footer--split' : ''}`}>
          {isEdit && (
            <button
              type="button"
              className="btn-danger-outline"
              onClick={() => setShowDeleteModal(true)}
              disabled={isSubmitting || deleteClient.isPending}
            >
              <Trash2 size={16} strokeWidth={1.5} />
              Eliminar Cliente
            </button>
          )}
          <div className="form-footer__right">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/admin/clientes')}
              disabled={isSubmitting || deleteClient.isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || deleteClient.isPending}
            >
              {isSubmitting
                ? isEdit
                  ? 'Guardando cambios...'
                  : 'Guardando...'
                : isEdit
                  ? 'Guardar Cambios'
                  : 'Guardar Cliente'}
            </button>
          </div>
        </div>

      </form>

      {/* ── Rutinas Asignadas (solo en modo edición) ── */}
      {isEdit && id && existingClient && (
        <div className="form-section" style={{ margin: '0 24px 24px', borderTop: '1px solid var(--color-outline-var)', paddingTop: '24px' }}>

          {/* Link del Alumno */}
          <div className="assigned-routines__link-panel">
            <div className="assigned-routines__link-info">
              <Link2 size={15} strokeWidth={2} />
              <span className="assigned-routines__link-label">Link de acceso: el alumno entra con {existingClient.email}</span>
            </div>
            <div className="assigned-routines__link-row">
              <code className="assigned-routines__link-url">/t/{profile?.slug}</code>
              <button
                type="button"
                className={`assigned-routines__link-copy${linkCopied ? ' assigned-routines__link-copy--copied' : ''}`}
                onClick={handleCopyLink}
                title="Copiar link"
              >
                {linkCopied ? '✓ Copiado' : 'Copiar Link'}
              </button>
            </div>
          </div>

          {/* Encabezado sección rutinas */}
          <div className="form-section__heading" style={{ marginTop: '20px' }}>
            <Dumbbell size={18} strokeWidth={1.5} className="form-section__icon" />
            <h2 className="form-section__title">Rutinas Asignadas</h2>
            <button
              type="button"
              className="btn-primary"
              style={{ marginLeft: 'auto', padding: '7px 14px', fontSize: '13px' }}
              onClick={() => setShowAssignModal(true)}
            >
              <Plus size={13} strokeWidth={2} />
              Asignar Rutina
            </button>
          </div>

          {/* Lista de rutinas asignadas */}
          {loadingAssigned ? (
            <LoadingSkeleton count={2} variant="card" />
          ) : assignedRoutines.length === 0 ? (
            <div className="assigned-routines__empty">
              <Dumbbell size={28} opacity={0.3} strokeWidth={1} />
              <p>Este cliente no tiene rutinas asignadas aún.</p>
            </div>
          ) : (
            <div className="assigned-routines__list">
              {assignedRoutines.map(ar => (
                <div key={ar.id} className="assigned-routine-item">
                  <div className="assigned-routine-item__info">
                    <span className="assigned-routine-item__name">
                      {ar.routines?.nombre ?? 'Rutina'}
                    </span>
                    {ar.routines?.dia && (
                      <span className="assigned-routine-item__day">{ar.routines.dia}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="assigned-routine-item__remove"
                    onClick={() => handleUnassign(ar.routine_id)}
                    title="Quitar rutina"
                    aria-label={`Quitar ${ar.routines?.nombre ?? 'rutina'}`}
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de confirmación para eliminar cliente */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Eliminar Cliente"
        variant="danger"
        confirmText="Eliminar Cliente"
        cancelText="Cancelar"
        isLoading={deleteClient.isPending}
        onConfirm={handleDelete}
        onClose={() => setShowDeleteModal(false)}
        description={
          existingClient ? (
            <p>
              ¿Estás seguro de que deseas eliminar permanentemente a{' '}
              <strong>{existingClient.nombre} {existingClient.apellido}</strong>?
              Esta acción no se puede deshacer y borrará su información asociada.
            </p>
          ) : (
            '¿Estás seguro de que deseas eliminar a este cliente permanentemente?'
          )
        }
      />

      {/* Modal para asignar rutinas */}
      {isEdit && id && existingClient && (
        <AssignRoutineModal
          isOpen={showAssignModal}
          clientId={id}
          clientName={`${existingClient.nombre} ${existingClient.apellido}`}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </div>
  )
}
