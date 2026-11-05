import { useLocation, useNavigate } from 'react-router-dom'
import { Check, ChevronRight, LogOut, X } from 'lucide-react'
import {
  countRoutineExercises,
  useClientAssignedRoutines,
  useMyClient,
  useRecentSessions,
  useStartWorkoutSession,
  type RecentSessionRow,
} from '../hooks/useClientDashboard'
import { useStudentArea } from '../hooks/useStudentArea'
import { useAuth } from '../../auth'
import ErrorState from '../../../components/ErrorState'
import './ClientDashboard.css'

function normalizeDay(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Local YYYY-MM-DD, the same format sessions are stored with */
function dayKey(date: Date): string {
  return date.toLocaleDateString('en-CA')
}

function fromKey(key: string): Date {
  return new Date(`${key}T12:00:00`)
}

function describeDay(key: string): string {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (key === dayKey(today)) return 'hoy'
  if (key === dayKey(yesterday)) return 'ayer'
  const date = fromKey(key)
  return `${date.toLocaleDateString('es-AR', { weekday: 'long' })} ${date.getDate()}/${date.getMonth() + 1}`
}

function exercisesDone(session: RecentSessionRow) {
  return session.session_exercises.filter(e => e.sets_completados >= e.series).length
}

function hasProgress(session: RecentSessionRow) {
  return session.status === 'completed' || session.session_exercises.some(e => e.sets_completados > 0)
}

const WEEK_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export default function ClientDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut } = useAuth()
  const { isPreview, basePath } = useStudentArea()

  const { data: dbClient, isLoading: loadingClient, error: clientError, refetch } = useMyClient()
  const { data: assignedRoutines = [], isLoading: loadingRoutines } = useClientAssignedRoutines(dbClient?.id ?? '')
  const { data: sessions = [] } = useRecentSessions(dbClient?.id ?? '')
  const startSession = useStartWorkoutSession()

  const isLoading = loadingClient || loadingRoutines
  const finishedName = (location.state as { finished?: string } | null)?.finished

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

  const today = new Date()
  const todayKey = dayKey(today)
  const todayName = normalizeDay(today.toLocaleDateString('es-AR', { weekday: 'long' }))

  const routines = assignedRoutines.filter(ar => ar.routines)
  const openSessionFor = (routineId: string) =>
    sessions.find(s => s.routine_id === routineId && s.status === 'in-progress')
  const lastDoneFor = (routineId: string) =>
    sessions.find(s => s.routine_id === routineId && s.status === 'completed')

  // What to train now: the one left halfway, then today's, then the one done longest ago
  const openRoutine = routines.find(ar => openSessionFor(ar.routine_id))
  const todaysRoutine = routines.find(ar => normalizeDay(ar.routines?.dia ?? '').includes(todayName))
  const oldestRoutine = [...routines].sort(
    (a, b) => (lastDoneFor(a.routine_id)?.fecha ?? '').localeCompare(lastDoneFor(b.routine_id)?.fecha ?? '')
  )[0]
  const featured = openRoutine ?? todaysRoutine ?? oldestRoutine
  const featuredTitle = openRoutine ? 'Para seguir' : todaysRoutine ? 'Hoy' : 'Tu próxima rutina'
  const featuredOpen = featured ? openSessionFor(featured.routine_id) : undefined
  const featuredLast = featured ? lastDoneFor(featured.routine_id) : undefined
  const featuredDoneToday = featuredLast?.fecha === todayKey && !featuredOpen
  const featuredCount = featured?.routines ? countRoutineExercises(featured.routines) : 0

  // Monday to Sunday of this week
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const week = WEEK_LETTERS.map((letter, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const key = dayKey(date)
    return {
      key,
      letter,
      day: date.getDate(),
      trained: sessions.some(s => s.fecha === key && hasProgress(s)),
      isToday: key === todayKey,
      isFuture: key > todayKey,
    }
  })
  const trainedThisWeek = week.filter(d => d.trained).length
  const history = sessions.filter(hasProgress).slice(0, 6)

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

      {finishedName && (
        <div className="cd-saved" role="status">
          <Check size={20} strokeWidth={2.5} aria-hidden="true" />
          <p>
            <strong>Sesión guardada: {finishedName}.</strong> Tu entrenador ya la puede ver.
          </p>
          <button
            type="button"
            className="cd-saved__close"
            onClick={() => navigate(location.pathname, { replace: true, state: null })}
            aria-label="Cerrar aviso"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {startSession.isError && (
        <p role="alert" className="alert cd-alert">
          No pudimos abrir la rutina. Revisá tu conexión e intentá de nuevo.
        </p>
      )}

      {featured?.routines && (
        <section className="cd-today" aria-labelledby="cd-today-title">
          <h2 id="cd-today-title" className="cd-section-title">{featuredTitle}</h2>
          <div className="cd-today__sheet">
            <h3 className="cd-today__name">{featured.routines.nombre}</h3>
            <p className="cd-today__facts">
              {[
                featured.routines.dia,
                featuredCount > 0 && `${featuredCount} ${featuredCount === 1 ? 'ejercicio' : 'ejercicios'}`,
              ]
                .filter(Boolean)
                .join('. ')}
            </p>
            {featured.routines.descripcion && <p className="cd-today__desc">{featured.routines.descripcion}</p>}
            <p className="cd-today__last">
              {featuredOpen
                ? `Empezada ${describeDay(featuredOpen.fecha)}. Llevás ${exercisesDone(featuredOpen)} de ${featuredOpen.session_exercises.length} ejercicios.`
                : featuredLast
                  ? `La hiciste por última vez ${describeDay(featuredLast.fecha)}.`
                  : 'Todavía no la hiciste.'}
            </p>
            <button
              type="button"
              className={`cd-today__btn${featuredDoneToday ? ' cd-today__btn--quiet' : ''}`}
              onClick={() => handleStart(featured.routine_id)}
              disabled={startSession.isPending}
              aria-label={`${featuredOpen ? 'Seguir' : 'Empezar'} ${featured.routines.nombre}`}
            >
              {featuredOpen ? 'Seguir donde dejé' : featuredDoneToday ? 'Entrenarla de nuevo' : 'Empezar'}
              <ChevronRight size={22} strokeWidth={2.25} />
            </button>
          </div>
        </section>
      )}

      <section className="cd-week" aria-labelledby="cd-week-title">
        <div className="cd-week__head">
          <h2 id="cd-week-title" className="cd-section-title">Esta semana</h2>
          <p className="cd-week__count">
            {trainedThisWeek === 0
              ? 'Sin entrenamientos todavía'
              : `${trainedThisWeek} ${trainedThisWeek === 1 ? 'día entrenado' : 'días entrenados'}`}
          </p>
        </div>
        <ol className="cd-week__days">
          {week.map(d => (
            <li
              key={d.key}
              className={`cd-day${d.trained ? ' cd-day--trained' : ''}${d.isToday ? ' cd-day--today' : ''}${d.isFuture ? ' cd-day--future' : ''}`}
              aria-label={`${fromKey(d.key).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' })}${d.trained ? ', entrenaste' : ''}${d.isToday ? ', hoy' : ''}`}
            >
              <span className="cd-day__letter" aria-hidden="true">{d.letter}</span>
              <span className="cd-day__num" aria-hidden="true">{d.day}</span>
              {d.trained && <Check className="cd-day__check" size={14} strokeWidth={3} aria-hidden="true" />}
            </li>
          ))}
        </ol>

        <div className="cd-program" aria-label={`Semana ${dbClient.semana_actual} de ${dbClient.total_semanas}`}>
          <p className="cd-program__label">
            Programa: semana <strong>{dbClient.semana_actual}</strong> de {dbClient.total_semanas}
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
        </div>
      </section>

      <section className="cd-routines" aria-labelledby="cd-routines-title">
        <h2 id="cd-routines-title" className="cd-section-title">Mis rutinas</h2>

        {routines.length === 0 ? (
          <p className="cd-routines__empty">
            Tu entrenador todavía no te asignó rutinas. Cuando lo haga, van a aparecer acá.
          </p>
        ) : (
          <ul className="cd-routines__list">
            {routines.map(ar => {
              const routine = ar.routines!
              const open = openSessionFor(ar.routine_id)
              const last = lastDoneFor(ar.routine_id)
              const count = countRoutineExercises(routine)
              return (
                <li key={ar.id} className="cd-routine">
                  <div className="cd-routine__info">
                    <h3 className="cd-routine__name">{routine.nombre}</h3>
                    <p className="cd-routine__meta">
                      {[routine.dia, count > 0 && `${count} ${count === 1 ? 'ejercicio' : 'ejercicios'}`]
                        .filter(Boolean)
                        .join('. ')}
                    </p>
                    <p className="cd-routine__last">
                      {open ? 'A mitad de camino' : last ? `Última vez: ${describeDay(last.fecha)}` : 'Sin hacer todavía'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="cd-routine__btn"
                    onClick={() => handleStart(routine.id)}
                    disabled={startSession.isPending}
                    aria-label={`Entrenar rutina ${routine.nombre}`}
                  >
                    {open ? 'Seguir' : 'Entrenar'}
                    <ChevronRight size={18} strokeWidth={2} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section className="cd-history" aria-labelledby="cd-history-title">
          <h2 id="cd-history-title" className="cd-section-title">Últimas sesiones</h2>
          <ul className="cd-history__list">
            {history.map(s => {
              const date = fromKey(s.fecha)
              const done = exercisesDone(s)
              const total = s.session_exercises.length
              return (
                <li key={s.id} className="cd-history__row">
                  <span className="cd-history__date">
                    {date.getDate()}/{date.getMonth() + 1}
                  </span>
                  <span className="cd-history__name">{s.nombre}</span>
                  <span className={`cd-history__state${s.status === 'in-progress' ? ' cd-history__state--open' : ''}`}>
                    {s.status === 'in-progress'
                      ? 'En curso'
                      : done === total
                        ? 'Completa'
                        : `${done} de ${total} ejercicios`}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
