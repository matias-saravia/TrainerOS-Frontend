import { useNavigate } from 'react-router-dom'
import { Dumbbell, ChevronRight, Calendar, LogOut } from 'lucide-react'
import {
  useClientAssignedRoutines,
  useMyClient,
  useStartWorkoutSession,
} from '../hooks/useClientDashboard'
import { useAuth } from '../../auth'
import ErrorState from '../../../components/ErrorState'
import './ClientDashboard.css'

export default function ClientDashboard() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const { data: dbClient, isLoading: loadingClient, error: clientError, refetch } = useMyClient()
  const { data: assignedRoutines = [], isLoading: loadingRoutines } = useClientAssignedRoutines(dbClient?.id ?? '')
  const startSession = useStartWorkoutSession()

  const isLoading = loadingClient || loadingRoutines

  const handleStart = async (routineId: string) => {
    try {
      const sessionId = await startSession.mutateAsync(routineId)
      navigate(`/alumno/sesion/${sessionId}`)
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

  const weekProgress = dbClient
    ? (dbClient.semana_actual - 1) / dbClient.total_semanas
    : 0

  const RING_R = 44
  const RING_CIRC = 2 * Math.PI * RING_R

  if (isLoading) {
    return (
      <div className="client-dashboard">
        <div className="cd-loading">
          <div className="cd-loading__spinner" />
          <p>Cargando tu programa...</p>
        </div>
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

  if (!dbClient) {
    return (
      <div className="client-dashboard">
        <div className="cd-not-found">
          <Dumbbell size={40} opacity={0.25} strokeWidth={1} />
          <h2>Tu cuenta no está vinculada</h2>
          <p>Entrá desde el link que te pasó tu entrenador.</p>
          <button type="button" className="cd-routine-card__btn" onClick={() => signOut()}>
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="client-dashboard">

      {/* ── Top Header ── */}
      <header className="cd-header">
        <div className="cd-header__greeting">
          <p className="cd-header__saludo">{greeting()},</p>
          <h1 className="cd-header__name">{dbClient.nombre}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="cd-routine-card__btn"
            onClick={() => signOut()}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut size={14} strokeWidth={2} />
          </button>
          <div
            className="cd-header__avatar"
            aria-label={`${dbClient.nombre} ${dbClient.apellido}`}
          >
            {dbClient.nombre[0]}{dbClient.apellido[0]}
          </div>
        </div>
      </header>

      {/* ── Bento Grid ── */}
      <div className="cd-bento">

        {/* ── Weekly Ring Hero — horizontal layout ── */}
        <div className="cd-bento-card cd-bento-card--ring">
          <div className="cd-ring-wrap">
            <svg
              className="cd-ring-svg"
              viewBox="0 0 100 100"
              aria-label={`Semana ${dbClient.semana_actual} de ${dbClient.total_semanas}`}
            >
              {/* Track */}
              <circle cx="50" cy="50" r={RING_R} fill="none" stroke="rgba(82,103,125,0.18)" strokeWidth="9" />
              {/* Progress */}
              <circle
                cx="50" cy="50" r={RING_R}
                fill="none"
                stroke="#1C2E4A"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={RING_CIRC * (1 - weekProgress)}
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)' }}
              />
              {/* Inner text */}
              <text x="50" y="45" textAnchor="middle" fontSize="17" fontWeight="700" fontFamily="'Plus Jakarta Sans', sans-serif" fill="#ffffff">
                {dbClient.semana_actual}/{dbClient.total_semanas}
              </text>
              <text x="50" y="58" textAnchor="middle" fontSize="7.5" fontFamily="'Inter', sans-serif" fill="rgba(82,103,125,0.8)" letterSpacing="0.08em">
                SEMANAS
              </text>
            </svg>
          </div>

          <div className="cd-ring-info">
            <p className="cd-ring-info__eyebrow">Progreso</p>
            <p className="cd-ring-info__headline">
              Semana {dbClient.semana_actual}
            </p>
            <p className="cd-ring-label">
              {Math.round(weekProgress * 100)}% del programa<br />completado
            </p>
          </div>
        </div>

        {/* Program progress card */}
        <div className="cd-bento-card cd-bento-card--program">
          <p className="cd-bento-card__label">Programa</p>
          <p className="cd-program__weeks">
            <strong>{dbClient.semana_actual}</strong>
            de {dbClient.total_semanas} sem.
          </p>
          <div className="cd-program__bar-wrap" aria-label={`Semana ${dbClient.semana_actual} de ${dbClient.total_semanas}`}>
            <div className="cd-program__bar">
              <div
                className="cd-program__bar-fill"
                style={{ width: `${weekProgress * 100}%` }}
              />
            </div>
          </div>
          <p className="cd-program__pct">
            {Math.round(weekProgress * 100)}% completado
          </p>
        </div>

        {/* Routines count card */}
        <div className="cd-bento-card cd-bento-card--program">
          <p className="cd-bento-card__label">Mis Rutinas</p>
          <p className="cd-program__weeks">
            <strong>{assignedRoutines.length}</strong>
            {assignedRoutines.length !== 1 ? ' asignadas' : ' asignada'}
          </p>
          <p className="cd-program__pct" style={{ marginTop: 4 }}>
            {assignedRoutines.length === 0
              ? 'Tu entrenador aún no asignó rutinas'
              : 'Ver rutinas abajo ↓'}
          </p>
        </div>

      </div>

      {/* ── Rutinas Asignadas ── */}
      <section className="cd-routines-section">
        <h2 className="cd-routines-section__title">
          <Dumbbell size={16} strokeWidth={1.5} />
          Mis Rutinas
        </h2>

        {startSession.isError && (
          <p role="alert" style={{ margin: '0 0 12px', padding: '12px', borderRadius: '6px', background: '#ffdad6', color: '#93000a', fontSize: '14px' }}>
            No pudimos abrir la rutina. Revisá tu conexión e intentá de nuevo.
          </p>
        )}

        {assignedRoutines.length === 0 ? (
          <div className="cd-routines-empty">
            <Dumbbell size={32} opacity={0.2} strokeWidth={1} />
            <p>Tu entrenador aún no te asignó ninguna rutina.</p>
            <span>¡Pronto aparecerán aquí!</span>
          </div>
        ) : (
          <div className="cd-routines-grid">
            {assignedRoutines.map(ar => {
              const routine = ar.routines
              if (!routine) return null
              return (
                <div key={ar.id} className="cd-routine-card">
                  <div className="cd-routine-card__accent" />
                  <div className="cd-routine-card__body">
                    <div className="cd-routine-card__info">
                      <h3 className="cd-routine-card__name">{routine.nombre}</h3>
                      {routine.dia && (
                        <div className="cd-routine-card__day">
                          <Calendar size={11} strokeWidth={1.5} />
                          {routine.dia}
                        </div>
                      )}
                      {routine.descripcion && (
                        <p className="cd-routine-card__desc">{routine.descripcion}</p>
                      )}
                    </div>
                    <button
                      className="cd-routine-card__btn"
                      onClick={() => handleStart(routine.id)}
                      disabled={startSession.isPending}
                      aria-label={`Entrenar rutina ${routine.nombre}`}
                    >
                      Entrenar
                      <ChevronRight size={13} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Bottom safe area */}
      <div style={{ height: 48 }} />
    </div>
  )
}
