import { useState } from 'react'
import { Copy, Check, UserPlus, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  useDashboardStats,
  useRecentClients,
  useUpcomingSessions,
  useActivityHeatmap,
} from '../hooks/useDashboardStats'
import { useAuth } from '../../auth'
import { getTrainerLink } from '../../../utils/trainerLink'
import { CLIENT_STATUS } from '../clientStatus'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import ErrorState from '../../../components/ErrorState'
import './DashboardPage.css'

const ACTIVITY_DAYS = 30

function localDateKey(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function formatSessionDate(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/* ── Activity: one bar per day, completed sessions ─────────────── */
function ActivityBars({ activityData }: { activityData: { date: string; count: number }[] }) {
  const counts = new Map(activityData.map(d => [d.date, d.count]))
  const days = Array.from({ length: ACTIVITY_DAYS }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (ACTIVITY_DAYS - 1 - i))
    return { key: localDateKey(d), count: counts.get(localDateKey(d)) ?? 0 }
  })
  const max = Math.max(1, ...days.map(d => d.count))
  const total = days.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="activity">
      <p className="activity__total">
        <strong>{total}</strong> {total === 1 ? 'sesión completada' : 'sesiones completadas'}
      </p>
      <div className="activity__bars" role="img" aria-label={`${total} sesiones completadas en ${ACTIVITY_DAYS} días`}>
        {days.map(d => (
          <span
            key={d.key}
            className="activity__bar"
            style={{ height: d.count === 0 ? undefined : `${(d.count / max) * 100}%` }}
            title={`${d.key}: ${d.count}`}
          />
        ))}
      </div>
      <div className="activity__axis">
        <span>Hace {ACTIVITY_DAYS} días</span>
        <span>Hoy</span>
      </div>
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const { profile } = useAuth()
  const trainerLink = getTrainerLink(profile?.slug)

  const { data: stats, isLoading: loadingStats, error: errorStats, refetch: refetchStats } = useDashboardStats()
  const { data: recentClients = [], isLoading: loadingClients } = useRecentClients()
  const { data: upcomingSessions = [], isLoading: loadingSessions } = useUpcomingSessions()
  const { data: heatmapData = [] } = useActivityHeatmap()

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(trainerLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  if (loadingStats) {
    return (
      <div className="dashboard">
        <header className="page-header">
          <h1 className="page-header__title">{today}</h1>
        </header>
        <LoadingSkeleton count={3} variant="stat" />
      </div>
    )
  }

  if (errorStats) {
    return (
      <div className="dashboard">
        <ErrorState message={errorStats.message} onRetry={() => refetchStats()} />
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="page-header">
        <h1 className="page-header__title">{today}</h1>
        <div className="dashboard__actions">
          <button className="btn-secondary" onClick={() => navigate('/admin/entrenamientos/rutinas/nueva')}>
            <Plus size={16} strokeWidth={1.75} />
            Nueva rutina
          </button>
          <button className="btn-secondary" onClick={() => navigate('/admin/entrenamientos/ejercicios/nuevo')}>
            <Plus size={16} strokeWidth={1.75} />
            Nuevo ejercicio
          </button>
        </div>
      </header>

      {/* Numbers strip */}
      <section className="strip" aria-label="Resumen">
        <div className="strip__cell">
          <p className="strip__value">{stats?.totalClients ?? 0}</p>
          <p className="strip__label">Alumnos</p>
        </div>
        <div className="strip__cell">
          <p className="strip__value">{stats?.sessionsThisMonth ?? 0}</p>
          <p className="strip__label">Sesiones este mes</p>
        </div>
        <div className="strip__cell strip__cell--link">
          <p className="strip__label">Link para tus alumnos</p>
          <div className="strip__link">
            <span>{trainerLink.replace(/^https?:\/\//, '')}</span>
            <button onClick={handleCopyLink} aria-label="Copiar link">
              {copied ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={1.5} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      </section>

      <div className="dashboard__columns">
        {/* Students */}
        <section className="sheet">
          <div className="sheet__head">
            <h2 className="sheet__title">Últimos alumnos</h2>
            <button className="sheet__link" onClick={() => navigate('/admin/clientes')}>Ver todos</button>
          </div>
          {loadingClients ? (
            <LoadingSkeleton count={3} variant="list" />
          ) : recentClients.length === 0 ? (
            <div className="dashboard__empty">
              <p>Todavía no cargaste alumnos. Cargá el primero y pasale tu link.</p>
              <button className="btn-primary" onClick={() => navigate('/admin/clientes/nuevo')}>
                <UserPlus size={16} strokeWidth={1.75} />
                Nuevo alumno
              </button>
            </div>
          ) : (
            <table className="hoja">
              <thead>
                <tr>
                  <th>Semana</th>
                  <th>Alumno</th>
                  <th>Objetivo</th>
                  <th className="hoja__end">Estado</th>
                </tr>
              </thead>
              <tbody>
                {recentClients.map(c => {
                  const status = CLIENT_STATUS[c.status]
                  return (
                    <tr
                      key={c.id}
                      data-clickable
                      className={c.status === 'pendiente' ? 'marker' : undefined}
                      onClick={() => navigate(`/admin/clientes/${c.id}/editar`)}
                    >
                      <td className="hoja__lead">{c.semana_actual}<small>/{c.total_semanas}</small></td>
                      <td className="hoja__name">{c.nombre} {c.apellido}</td>
                      <td>{c.objetivo ?? c.plan_tier}</td>
                      <td className="hoja__end"><span className={`status ${status?.tone ?? ''}`}>{status?.label ?? c.status}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

        <div className="dashboard__side">
          {/* Upcoming */}
          <section className="sheet">
            <div className="sheet__head">
              <h2 className="sheet__title">Próximas sesiones</h2>
            </div>
            {loadingSessions ? (
              <LoadingSkeleton count={2} variant="list" />
            ) : upcomingSessions.length === 0 ? (
              <p className="dashboard__none">No hay sesiones programadas.</p>
            ) : (
              <ul className="sessions">
                {upcomingSessions.map(s => (
                  <li key={s.id} className="sessions__row">
                    <span className="sessions__date">{formatSessionDate(s.fecha)}</span>
                    <span className="sessions__who">
                      <strong>{s.clients ? `${s.clients.nombre} ${s.clients.apellido}`.trim() : 'Alumno'}</strong>
                      {s.nombre}
                    </span>
                    {s.status === 'completed' && <span className="status status--ok">Hecha</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Activity */}
          <section className="sheet">
            <div className="sheet__head">
              <h2 className="sheet__title">Actividad</h2>
            </div>
            <ActivityBars activityData={heatmapData} />
          </section>
        </div>
      </div>
    </div>
  )
}
