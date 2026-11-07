import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCheck, ChevronLeft } from 'lucide-react'
import {
  toSessionExercise,
  useCompleteWorkoutSession,
  useLogWorkoutSet,
  usePreviousWeights,
  useUndoWorkoutSet,
  useWorkoutSession,
} from '../hooks/useClientDashboard'
import { useStudentArea } from '../hooks/useStudentArea'
import ExerciseSessionCard from '../components/ExerciseSessionCard'
import RestTimer from '../components/RestTimer'
import { useRestTimer } from '../hooks/useRestTimer'
import ErrorState from '../../../components/ErrorState'
import './WorkoutSessionPage.css'

export default function WorkoutSessionPage() {
  const { sesionId = '' } = useParams()
  const navigate = useNavigate()
  const { isPreview, basePath } = useStudentArea()

  const { data: session, isLoading, error, refetch } = useWorkoutSession(sesionId)
  const logSet = useLogWorkoutSet(sesionId)
  const undoSet = useUndoWorkoutSet(sesionId)
  const completeSession = useCompleteWorkoutSession(sesionId)
  const restTimer = useRestTimer()
  const [finishing, setFinishing] = useState(false)
  const [esfuerzo, setEsfuerzo] = useState<number | null>(null)
  const [comentario, setComentario] = useState('')

  const exercises = (session?.session_exercises ?? []).map(toSessionExercise)
  const isFinished = session?.status === 'completed'

  const completedCount = exercises.filter(e => e.setsCompletados >= e.series).length
  const totalCount = exercises.length
  const allDone = totalCount > 0 && completedCount === totalCount
  const activeIndex = exercises.findIndex(e => e.setsCompletados < e.series)
  const pendingCount = totalCount - completedCount

  const { data: previousWeights = {} } = usePreviousWeights(
    session?.client_id ?? '',
    sesionId,
    exercises.map(e => e.ejercicioId),
  )

  const handleSetComplete = (id: string, kg?: number) => {
    if (isPreview) return
    const exercise = exercises.find(e => e.id === id)
    logSet.mutate(
      { id, kg },
      {
        onSuccess: () => {
          // No rest after the last set of the whole session
          const isLastSet = exercise && exercise.setsCompletados + 1 >= exercise.series
          if (exercise && !(isLastSet && pendingCount <= 1)) restTimer.start(exercise.descanso)
        },
      },
    )
  }

  const handleUndo = (id: string) => {
    if (isPreview) return
    undoSet.mutate(id, { onSuccess: () => restTimer.stop() })
  }

  const handleFinalize = async () => {
    if (isFinished || isPreview) {
      navigate(basePath)
      return
    }
    // First tap opens the closing panel; the second saves
    if (!finishing) {
      setFinishing(true)
      return
    }
    try {
      await completeSession.mutateAsync({ esfuerzo: esfuerzo ?? undefined, comentario })
      restTimer.stop()
      navigate(basePath, { state: { finished: session?.nombre } })
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
    : undoSet.isError
      ? 'No pudimos deshacer la serie. Revisá tu conexión e intentá de nuevo.'
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
                onSetComplete={handleSetComplete}
                onUndo={handleUndo}
                previousKg={previousWeights[ex.ejercicioId]}
                saving={logSet.isPending || undoSet.isPending}
                sesionId={sesionId}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="ws-footer">
        {!isFinished && !finishing && <RestTimer />}
        {finishing && (
          <div className="ws-finish">
            <h2 className="ws-finish__title">Cerrar la sesión</h2>
            {pendingCount > 0 && (
              <p className="ws-finish__warn" role="alert">
                Te {pendingCount === 1 ? 'falta 1 ejercicio' : `faltan ${pendingCount} ejercicios`}. Si finalizás, la
                sesión se guarda así.
              </p>
            )}
            <fieldset className="ws-finish__effort">
              <legend>¿Cuánto te costó? Es opcional</legend>
              <div className="ws-finish__scale">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={esfuerzo === n}
                    aria-label={`Esfuerzo ${n} de 10`}
                    onClick={() => setEsfuerzo(esfuerzo === n ? null : n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="ws-finish__ends" aria-hidden="true">
                <span>Muy fácil</span>
                <span>Al máximo</span>
              </p>
            </fieldset>
            <label className="ws-finish__field">
              Comentario para tu entrenador, si querés
              <textarea
                rows={2}
                maxLength={500}
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                placeholder="Ej. me molestó el hombro en el press"
              />
            </label>
          </div>
        )}
        <button
          id="btn-finalizar-sesion"
          className={`ws-footer__btn${allDone || finishing ? ' ws-footer__btn--ready' : ''}`}
          onClick={handleFinalize}
          disabled={completeSession.isPending}
        >
          <CheckCheck size={20} strokeWidth={2} />
          {isFinished || isPreview ? 'Volver al inicio' : finishing ? 'Guardar y finalizar' : 'Finalizar sesión'}
        </button>
        {finishing && (
          <button type="button" className="ws-footer__cancel" onClick={() => setFinishing(false)}>
            Seguir entrenando
          </button>
        )}
      </footer>
    </div>
  )
}
