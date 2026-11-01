import { useNavigate, useParams } from 'react-router-dom'
import { CheckCheck, ChevronLeft } from 'lucide-react'
import {
  toSessionExercise,
  useCompleteWorkoutSession,
  useLogWorkoutSet,
  useWorkoutSession,
} from '../hooks/useClientDashboard'
import { useStudentArea } from '../hooks/useStudentArea'
import ExerciseSessionCard from '../components/ExerciseSessionCard'
import ErrorState from '../../../components/ErrorState'
import './WorkoutSessionPage.css'

export default function WorkoutSessionPage() {
  const { sesionId = '' } = useParams()
  const navigate = useNavigate()
  const { isPreview, basePath } = useStudentArea()

  const { data: session, isLoading, error, refetch } = useWorkoutSession(sesionId)
  const logSet = useLogWorkoutSet(sesionId)
  const completeSession = useCompleteWorkoutSession(sesionId)

  const exercises = (session?.session_exercises ?? []).map(toSessionExercise)
  const isFinished = session?.status === 'completed'

  const completedCount = exercises.filter(e => e.setsCompletados >= e.series).length
  const totalCount = exercises.length
  const allDone = totalCount > 0 && completedCount === totalCount
  const activeIndex = exercises.findIndex(e => e.setsCompletados < e.series)

  const handleFinalize = async () => {
    if (isFinished || isPreview) {
      navigate(basePath)
      return
    }
    try {
      await completeSession.mutateAsync()
      navigate(basePath)
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
      <div className="workout-session-page">
        <p className="ws-message" role="status">Cargando sesión…</p>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="workout-session-page">
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
      <header className="ws-header">
        <div className="ws-header__inner">
          <button
            className="ws-header__back"
            onClick={() => navigate(basePath)}
            aria-label="Volver a mis rutinas"
          >
            <ChevronLeft size={24} strokeWidth={1.75} />
          </button>

          <div className="ws-header__info">
            <h1 className="ws-header__title">{session.nombre}</h1>
            <p className="ws-header__date">{formatDate()}</p>
          </div>

          <p className="ws-header__count" aria-label={`${completedCount} de ${totalCount} ejercicios completados`}>
            {completedCount}<small>/{totalCount}</small>
          </p>
        </div>

        <div
          className="ws-header__progress-bar"
          role="progressbar"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
        >
          {exercises.map((ex, i) => (
            <span
              key={ex.id}
              className={`ws-header__tick${
                ex.setsCompletados >= ex.series
                  ? ' ws-header__tick--done'
                  : i === activeIndex
                    ? ' ws-header__tick--now'
                    : ''
              }`}
            />
          ))}
        </div>
      </header>

      <main className="ws-content">
        {saveError && <p role="alert" className="alert ws-alert">{saveError}</p>}
        {exercises.length === 0 ? (
          <p className="ws-empty">Esta rutina todavía no tiene ejercicios.</p>
        ) : (
          <div className="ws-exercises">
            {exercises.map((ex, i) => (
              <ExerciseSessionCard
                key={ex.id}
                exercise={ex}
                index={i}
                isActive={i === activeIndex && !isFinished}
                readOnly={isFinished}
                onSetComplete={(id, kg) => {
                  if (!isPreview) logSet.mutate({ id, kg })
                }}
                sesionId={sesionId}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="ws-footer">
        <button
          id="btn-finalizar-sesion"
          className={`ws-footer__btn${allDone ? ' ws-footer__btn--ready' : ''}`}
          onClick={handleFinalize}
          disabled={completeSession.isPending}
          aria-label={isFinished || isPreview ? 'Volver al inicio' : 'Finalizar sesión de entrenamiento'}
        >
          <CheckCheck size={20} strokeWidth={2} />
          {isFinished || isPreview ? 'Volver al inicio' : 'Finalizar sesión'}
        </button>
      </footer>
    </div>
  )
}
