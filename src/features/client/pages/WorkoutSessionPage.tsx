import { useNavigate, useParams } from 'react-router-dom'
import { CheckCheck, Dumbbell } from 'lucide-react'
import {
  toSessionExercise,
  useCompleteWorkoutSession,
  useLogWorkoutSet,
  useMyClient,
  useWorkoutSession,
} from '../hooks/useClientDashboard'
import ExerciseSessionCard from '../components/ExerciseSessionCard'
import ErrorState from '../../../components/ErrorState'
import './WorkoutSessionPage.css'

export default function WorkoutSessionPage() {
  const { sesionId = '' } = useParams()
  const navigate = useNavigate()

  const { data: client } = useMyClient()
  const { data: session, isLoading, error, refetch } = useWorkoutSession(sesionId)
  const logSet = useLogWorkoutSet(sesionId)
  const completeSession = useCompleteWorkoutSession(sesionId)

  const clientName = client ? `${client.nombre} ${client.apellido}`.trim() : ''
  const clientInitials = client ? `${client.nombre?.[0] || ''}${client.apellido?.[0] || ''}` : ''

  const exercises = (session?.session_exercises ?? []).map(toSessionExercise)
  const isFinished = session?.status === 'completed'

  const completedCount = exercises.filter(e => e.setsCompletados >= e.series).length
  const totalCount = exercises.length
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const allDone = totalCount > 0 && completedCount === totalCount

  const handleFinalize = async () => {
    if (isFinished) {
      navigate('/alumno')
      return
    }
    try {
      await completeSession.mutateAsync()
      navigate('/alumno')
    } catch (err) {
      console.error('Error finishing session:', err)
    }
  }

  const formatDate = () => {
    return new Date(`${session?.fecha}T12:00:00`).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  if (isLoading) {
    return (
      <div className="workout-session-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px' }}>Cargando sesión...</p>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="workout-session-page" style={{ justifyContent: 'center', padding: '24px' }}>
        <ErrorState message="No pudimos cargar esta sesión." onRetry={() => refetch()} />
      </div>
    )
  }

  const saveError = logSet.isError
    ? 'No pudimos guardar la última serie. Revisá tu conexión y volvé a marcarla.'
    : completeSession.isError
      ? 'No pudimos finalizar la sesión. Revisá tu conexión e intentá de nuevo.'
      : null

  return (
    <div className="workout-session-page">

      {/* ── Sticky Top Header ── */}
      <header className="ws-header">
        <div className="ws-header__inner">
          <button
            className="ws-header__back"
            onClick={() => navigate('/alumno')}
            aria-label="Volver al dashboard"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <div className="ws-header__info">
            <h1 className="ws-header__title">{session.nombre}</h1>
            <p className="ws-header__date">{formatDate()}</p>
          </div>

          {/* Avatar */}
          <div className="ws-header__avatar" aria-label={clientName}>
            {clientInitials}
          </div>
        </div>

        {/* Progress bar */}
        <div className="ws-header__progress-bar" role="progressbar" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={totalCount}>
          <div
            className="ws-header__progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="ws-header__progress-label">
          {completedCount}/{totalCount} ejercicios completados
        </p>
      </header>

      {/* ── Exercise List ── */}
      <main className="ws-content">
        {saveError && (
          <p role="alert" style={{ margin: '0 0 12px', padding: '12px', borderRadius: '6px', background: '#ffdad6', color: '#93000a', fontSize: '14px' }}>
            {saveError}
          </p>
        )}
        {exercises.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'rgba(255,255,255,0.5)' }}>
            <Dumbbell size={36} opacity={0.3} strokeWidth={1} style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: '14px' }}>Esta rutina no contiene ejercicios cargados todavía.</p>
          </div>
        ) : (
          <div className="ws-exercises">
            {exercises.map((ex, i) => (
              <ExerciseSessionCard
                key={ex.id}
                exercise={ex}
                index={i}
                readOnly={isFinished}
                onSetComplete={(id, kg) => logSet.mutate({ id, kg })}
                sesionId={sesionId}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Sticky Footer: Finalizar ── */}
      <footer className="ws-footer">
        <button
          id="btn-finalizar-sesion"
          className={`ws-footer__btn${allDone ? ' ws-footer__btn--ready' : ''}`}
          onClick={handleFinalize}
          disabled={completeSession.isPending}
          aria-label={isFinished ? 'Volver al inicio' : 'Finalizar sesión de entrenamiento'}
        >
          <CheckCheck size={20} strokeWidth={2} />
          {isFinished ? 'Volver al inicio' : 'Finalizar Sesión'}
        </button>
      </footer>

    </div>
  )
}
