import { useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut } from 'lucide-react'
import {
  useClientAssignedRoutines,
  useMyClient,
  useStartWorkoutSession,
} from '../hooks/useClientDashboard'
import { useStudentArea } from '../hooks/useStudentArea'
import { useAuth } from '../../auth'
import ErrorState from '../../../components/ErrorState'
import './ClientDashboard.css'

function normalizeDay(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function ClientDashboard() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { isPreview, basePath } = useStudentArea()

  const { data: dbClient, isLoading: loadingClient, error: clientError, refetch } = useMyClient()
  const { data: assignedRoutines = [], isLoading: loadingRoutines } = useClientAssignedRoutines(dbClient?.id ?? '')
  const startSession = useStartWorkoutSession()

  const isLoading = loadingClient || loadingRoutines

  const handleStart = async (routineId: string) => {
    if (isPreview) {
      navigate(`${basePath}/sesion/${routineId}`)
      return
    }
    try {
      const sessionId = await startSession.mutateAsync(routineId)
      navigate(`${basePath}/sesion/${sessionId}`)
    } catch (err) {
      console.error('Error starting session:', err)
    }
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  if (isLoading) {
    return (
      <div className="client-dashboard">
        <p className="cd-message" role="status">Cargando tu programa…</p>
      </div>
    )
  }

  if (clientError) {
    return (
      <div className="client-dashboard">
        <ErrorState message="No pudimos cargar tu programa." onRetry={() => refetch()} />
      </div>
    )
  }

  if (!dbClient && isPreview) {
    return (
      <div className="client-dashboard">
        <div className="cd-message">
          <h2 className="cd-message__title">No encontramos a este alumno</h2>
        </div>
      </div>
    )
  }

  if (!dbClient) {
    return (
      <div className="client-dashboard">
        <div className="cd-message">
          <h2 className="cd-message__title">Tu cuenta no está vinculada</h2>
          <p>Entrá desde el link que te pasó tu entrenador.</p>
          <button type="button" className="cd-outline-btn" onClick={() => signOut()}>
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  const routines = assignedRoutines.filter(ar => ar.routines)
  const todayName = normalizeDay(new Date().toLocaleDateString('es-AR', { weekday: 'long' }))
  const nextRoutine =
    routines.find(ar => normalizeDay(ar.routines?.dia ?? '').includes(todayName)) ?? routines[0]

  return (
    <div className="client-dashboard">
      <header className="cd-header">
        <div>
          <p className="cd-header__greeting">{greeting()},</p>
          <h1 className="cd-header__name">{dbClient.nombre}</h1>
        </div>
        {!isPreview && (
          <button
            type="button"
            className="cd-icon-btn"
            onClick={() => signOut()}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut size={20} strokeWidth={1.5} />
          </button>
        )}
      </header>

      {/* Program: one tick per week */}
      <section className="cd-program" aria-label={`Semana ${dbClient.semana_actual} de ${dbClient.total_semanas}`}>
        <p className="cd-program__label">
          Semana <strong>{dbClient.semana_actual}</strong> de {dbClient.total_semanas}
        </p>
        <div className="cd-program__ticks" aria-hidden="true">
          {Array.from({ length: dbClient.total_semanas }, (_, i) => (
            <span
              key={i}
              className={`cd-program__tick${
                i + 1 < dbClient.semana_actual
                  ? ' cd-program__tick--done'
                  : i + 1 === dbClient.semana_actual
                    ? ' cd-program__tick--now'
                    : ''
              }`}
            />
          ))}
        </div>
      </section>

      <section className="cd-routines">
        <h2 className="cd-routines__title">Mis rutinas</h2>

        {startSession.isError && (
          <p role="alert" className="alert cd-routines__alert">
            No pudimos abrir la rutina. Revisá tu conexión e intentá de nuevo.
          </p>
        )}

        {routines.length === 0 ? (
          <p className="cd-routines__empty">Tu entrenador todavía no te asignó rutinas. Cuando lo haga, van a aparecer acá.</p>
        ) : (
          <ul className="cd-routines__list">
            {routines.map(ar => {
              const routine = ar.routines!
              const isNext = ar.id === nextRoutine?.id
              return (
                <li key={ar.id} className={`cd-routine${isNext ? ' cd-routine--next' : ''}`}>
                  <div className="cd-routine__info">
                    <h3 className="cd-routine__name">{routine.nombre}</h3>
                    {routine.dia && <p className="cd-routine__day">{routine.dia}</p>}
                    {routine.descripcion && <p className="cd-routine__desc">{routine.descripcion}</p>}
                  </div>
                  <button
                    className={`cd-routine__btn${isNext ? ' cd-routine__btn--next' : ''}`}
                    onClick={() => handleStart(routine.id)}
                    disabled={startSession.isPending}
                    aria-label={`Entrenar rutina ${routine.nombre}`}
                  >
                    Entrenar
                    <ChevronRight size={18} strokeWidth={2} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
