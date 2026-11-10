import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Dumbbell, Eye, MessageSquare, Pencil } from 'lucide-react'
import { useClient } from '../hooks/useClients'
import { useClientSessions, useClientWeights, useReplyToSession } from '../hooks/useClientProgress'
import { daysBetween, exerciseLoads, exercisesDone, trained, weeklyCounts, type ProgressSession } from '../progress'
import { dayKey, fromKey } from '../../../utils/dates'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import ErrorState from '../../../components/ErrorState'
import EmptyState from '../../../components/EmptyState'
import './ProgresoAlumnoPage.css'

// A week without training is when the trainer should reach out
const QUIET_DAYS = 7

const shortDate = (key: string) => {
  const date = fromKey(key)
  return `${date.getDate()}/${date.getMonth() + 1}`
}

const formatKg = (kg: number) => `${kg.toLocaleString('es-AR')} kg`

function sinceText(days: number): string {
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

/** The student's comment, and the trainer's reply to it, written in place. */
function SessionNote({ session, clientId }: { session: ProgressSession; clientId: string }) {
  const reply = useReplyToSession(clientId)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(session.respuesta ?? '')

  if (!session.notes && !session.respuesta) return null

  const save = () =>
    reply.mutate({ sessionId: session.id, respuesta: text }, { onSuccess: () => setEditing(false) })

  return (
    <div className="progreso-note">
      {session.notes && <p className="progreso-note__comment">{session.notes}</p>}

      {editing ? (
        <div className="progreso-note__form">
          <label className="sr-only" htmlFor={`respuesta-${session.id}`}>Tu respuesta</label>
          <textarea
            id={`respuesta-${session.id}`}
            rows={2}
            maxLength={500}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Ej. Bien que avisaste: la próxima bajá a 50 kg."
            autoFocus
          />
          {reply.isError && (
            <p className="progreso-note__error" role="alert">No pudimos guardar la respuesta. Intentá de nuevo.</p>
          )}
          <div className="progreso-note__actions">
            <button type="button" className="btn-primary" onClick={save} disabled={reply.isPending}>
              {reply.isPending ? 'Enviando…' : 'Enviar respuesta'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setText(session.respuesta ?? '')
                setEditing(false)
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : session.respuesta ? (
        <p className="progreso-note__reply">
          <span>Tu respuesta:</span> {session.respuesta}{' '}
          <button type="button" className="progreso-note__link" onClick={() => setEditing(true)}>
            Editar
          </button>
        </p>
      ) : (
        <button type="button" className="progreso-note__answer" onClick={() => setEditing(true)}>
          <MessageSquare size={15} strokeWidth={1.75} />
          Responder
        </button>
      )}
    </div>
  )
}

export default function ProgresoAlumnoPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()

  const { data: client, isLoading: loadingClient, error: clientError, refetch } = useClient(id)
  const { data: sessions = [], isLoading: loadingSessions } = useClientSessions(id)
  const { data: weights = [], isLoading: loadingWeights } = useClientWeights(id)

  if (loadingClient) {
    return (
      <div className="progreso">
        <LoadingSkeleton count={3} variant="card" />
      </div>
    )
  }

  if (clientError || !client) {
    return (
      <div className="progreso">
        <ErrorState message="No pudimos cargar a este alumno." onRetry={() => refetch()} />
      </div>
    )
  }

  const today = new Date()
  const todayKey = dayKey(today)
  const trainedSessions = sessions.filter(trained)
  const last = trainedSessions[0]
  const sinceLast = last ? daysBetween(last.fecha, todayKey) : null
  const isQuiet = sinceLast == null || sinceLast >= QUIET_DAYS
  const weeks = weeklyCounts(sessions, today)
  const maxWeek = Math.max(1, ...weeks.map(w => w.sessions))
  const thisWeek = weeks[weeks.length - 1].sessions
  const loads = exerciseLoads(weights)
  const shown = trainedSessions.slice(0, 30)
  const unanswered = shown.filter(s => s.notes && !s.respuesta).length

  return (
    <div className="progreso">
      <header className="page-header">
        <div>
          <button className="progreso__back" onClick={() => navigate('/admin/clientes')}>
            <ArrowLeft size={16} strokeWidth={2} />
            Alumnos
          </button>
          <h1 className="page-header__title">{client.nombre} {client.apellido}</h1>
          {client.objetivo && <p className="page-header__sub">{client.objetivo}</p>}
        </div>
        <div className="progreso__actions">
          <button className="btn-secondary" onClick={() => navigate(`/vista-alumno/${client.id}`)}>
            <Eye size={16} strokeWidth={1.75} />
            Ver como alumno
          </button>
          <button
            className="btn-primary"
            onClick={() => navigate(`/admin/clientes/${client.id}/editar`)}
            aria-label={`Editar a ${client.nombre}`}
          >
            <Pencil size={16} strokeWidth={1.75} />
            Editar alumno
          </button>
        </div>
      </header>

      <section className="strip progreso__strip" aria-label="Resumen">
        <div className={`strip__cell${isQuiet ? ' progreso__strip-alert' : ''}`}>
          <p className="strip__value">{sinceLast == null ? 'Nunca' : sinceText(sinceLast)}</p>
          <p className="strip__label">
            {last
              ? `Última sesión: ${fromKey(last.fecha).toLocaleDateString('es-AR', { weekday: 'long' })} ${shortDate(last.fecha)}`
              : 'Todavía no registró ninguna sesión'}
          </p>
        </div>
        <div className="strip__cell">
          <p className="strip__value">{thisWeek}</p>
          <p className="strip__label">{thisWeek === 1 ? 'Sesión esta semana' : 'Sesiones esta semana'}</p>
        </div>
        <div className="strip__cell">
          <p className="strip__value">
            {client.semana_actual}
            <small>/{client.total_semanas}</small>
          </p>
          <p className="strip__label">Semana del programa</p>
        </div>
      </section>

      <section className="sheet progreso__sheet" aria-labelledby="progreso-sesiones">
        <div className="sheet__head">
          <h2 id="progreso-sesiones" className="sheet__title">Sesiones</h2>
          {unanswered > 0 ? (
            <span className="progreso__pending">
              {unanswered === 1 ? '1 comentario sin responder' : `${unanswered} comentarios sin responder`}
            </span>
          ) : (
            trainedSessions.length > shown.length && (
              <span className="progreso__count">Últimas {shown.length} de {trainedSessions.length}</span>
            )
          )}
        </div>
        {loadingSessions ? (
          <LoadingSkeleton count={3} variant="list" />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Todavía no entrenó"
            description="Cuando registre su primera serie, la sesión aparece acá con el esfuerzo y su comentario."
          />
        ) : (
          <table className="hoja progreso-sesiones">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Rutina</th>
                <th>Hecho</th>
                <th>Esfuerzo</th>
                <th>Comentario</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(s => {
                const done = exercisesDone(s)
                const total = s.session_exercises.length
                const isOpen = s.status === 'in-progress'
                return (
                  <tr key={s.id}>
                    <td className="hoja__lead">{shortDate(s.fecha)}</td>
                    <td className="hoja__name">{s.nombre}</td>
                    <td className="progreso-sesiones__done">
                      {isOpen && s.fecha === todayKey
                        ? 'Entrenando ahora'
                        : done === total
                          ? 'Completa'
                          : `${done} de ${total} ejercicios`}
                    </td>
                    <td className="progreso-sesiones__effort">
                      {s.esfuerzo != null ? (
                        <>
                          {s.esfuerzo}
                          <small>/10</small>
                        </>
                      ) : (
                        <span className="progreso__muted">Sin dato</span>
                      )}
                    </td>
                    <td className="progreso-sesiones__note">
                      <SessionNote session={s} clientId={client.id} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <div className="progreso__columns">
        <section className="sheet" aria-labelledby="progreso-constancia">
          <div className="sheet__head">
            <h2 id="progreso-constancia" className="sheet__title">Constancia</h2>
            <span className="progreso__count">Últimas 8 semanas</span>
          </div>
          <ol
            className="progreso-weeks"
            aria-label={weeks.map(w => `Semana del ${shortDate(w.start)}: ${w.sessions}`).join('. ')}
          >
            {weeks.map((w, i) => (
              <li key={w.start} className={i === weeks.length - 1 ? 'progreso-weeks__now' : undefined}>
                <span className="progreso-weeks__value">{w.sessions}</span>
                <span className="progreso-weeks__bar" style={{ height: `${(w.sessions / maxWeek) * 100}%` }} />
                <span className="progreso-weeks__label">{i === weeks.length - 1 ? 'Esta' : shortDate(w.start)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="sheet" aria-labelledby="progreso-cargas">
          <div className="sheet__head">
            <h2 id="progreso-cargas" className="sheet__title">Cargas</h2>
          </div>
          {loadingWeights ? (
            <LoadingSkeleton count={3} variant="list" />
          ) : loads.length === 0 ? (
            <p className="progreso__empty">Las cargas aparecen cuando registre series con peso.</p>
          ) : (
            <table className="hoja progreso-cargas">
              <thead>
                <tr>
                  <th>Ejercicio</th>
                  <th>Primera</th>
                  <th>Última</th>
                  <th>Cambio</th>
                </tr>
              </thead>
              <tbody>
                {loads.map(l => {
                  const change = l.last - l.first
                  return (
                    <tr key={l.exerciseId}>
                      <td>
                        <span className="hoja__name">{l.nombre}</span>
                        <small className="progreso-cargas__meta">
                          {l.days === 1 ? '1 día' : `${l.days} días`}, mejor {formatKg(l.best)}
                        </small>
                      </td>
                      <td>{formatKg(l.first)}</td>
                      <td>{formatKg(l.last)}</td>
                      <td className={change > 0 ? 'progreso-cargas__up' : change < 0 ? 'progreso-cargas__down' : undefined}>
                        {change === 0 ? 'Igual' : `${change > 0 ? '+' : '−'}${formatKg(Math.abs(change))}`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
