import { useState } from 'react'
import { Copy, UserPlus, Plus, CalendarPlus, MoreHorizontal, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  useDashboardStats,
  useRecentClients,
  useUpcomingSessions,
  useActivityHeatmap,
} from '../hooks/useDashboardStats'
import { useAuth } from '../../auth'
import { getTrainerLink } from '../../../utils/trainerLink'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import ErrorState from '../../../components/ErrorState'
import './DashboardPage.css'

/* ── Progress Ring SVG ─────────────────────────────────────────── */
function ProgressRing({ percent }: { percent: number }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const filled = (percent / 100) * circ

  return (
    <svg className="progress-ring" viewBox="0 0 128 128" width="128" height="128">
      {/* Outer track */}
      <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(189,196,212,0.25)" strokeWidth="10" />
      {/* Outer fill */}
      <circle
        cx="64" cy="64" r={r}
        fill="none"
        stroke="white"
        strokeWidth="10"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 64 64)"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      {/* Inner track */}
      <circle cx="64" cy="64" r="38" fill="none" stroke="rgba(189,196,212,0.15)" strokeWidth="8" />
      {/* Inner fill */}
      <circle
        cx="64" cy="64" r="38"
        fill="none"
        stroke="rgba(189,196,212,0.55)"
        strokeWidth="8"
        strokeDasharray={`${(0.68 * 2 * Math.PI * 38)} ${2 * Math.PI * 38}`}
        strokeLinecap="round"
        transform="rotate(-90 64 64)"
      />
      <text x="64" y="60" textAnchor="middle" fill="white" fontSize="18" fontWeight="700" fontFamily="'Plus Jakarta Sans',sans-serif">
        {percent}%
      </text>
      <text x="64" y="76" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="10" fontFamily="Inter,sans-serif">
        Meta
      </text>
    </svg>
  )
}

/* ── Heatmap ────────────────────────────────────────────────────── */
const intensityBg = ['#e5e2dc', '#8496b7', '#4d6080', '#1C2E4A']

function HeatmapGrid({ activityData }: { activityData: { date: string; count: number }[] }) {
  // Build a 5x7 grid from the 30-35 days of data or default empty
  const activityMap = new Map(activityData.map(d => [d.date, d.count]))
  const days: number[] = []
  
  for (let i = 34; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateKey = d.toISOString().split('T')[0]
    const count = activityMap.get(dateKey) ?? 0
    const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : 3
    days.push(level)
  }

  // Slice into 5 rows of 7
  const rows: number[][] = []
  for (let r = 0; r < 5; r++) {
    rows.push(days.slice(r * 7, (r + 1) * 7))
  }

  return (
    <div className="heatmap">
      {rows.map((row, ri) => (
        <div key={ri} className="heatmap__row">
          {row.map((lvl, ci) => (
            <div
              key={ci}
              className="heatmap__cell"
              style={{ background: intensityBg[lvl] }}
              title={`Nivel de actividad: ${lvl}`}
            />
          ))}
        </div>
      ))}
      <div className="heatmap__legend">
        <span>Menos Activo</span>
        <div className="heatmap__legend-swatches">
          {intensityBg.map((bg, i) => (
            <div key={i} className="heatmap__cell heatmap__cell--sm" style={{ background: bg }} />
          ))}
        </div>
        <span>Muy Activo</span>
      </div>
    </div>
  )
}

function getInitials(nombre: string, apellido?: string | null): string {
  const first = nombre.charAt(0) || ''
  const second = (apellido && apellido.charAt(0)) || ''
  return (first + second).toUpperCase() || 'C'
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

  if (loadingStats) {
    return (
      <div className="dashboard">
        <div className="dashboard__header">
          <h1 className="dashboard__greeting">Cargando estadísticas...</h1>
        </div>
        <LoadingSkeleton count={3} variant="card" />
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

  const clientCount = stats?.totalClients ?? 0
  const monthlySessions = stats?.sessionsThisMonth ?? 0

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard__header">
        <div className="dashboard__header-left">
          <h1 className="dashboard__greeting">¡Bienvenido de nuevo, Coach!</h1>
          <p className="dashboard__sub">Tu link de acceso para alumnos es:</p>
        </div>
        <div className="dashboard__link-chip">
          <span>{trainerLink.replace(/^https?:\/\//, '')}</span>
          <button className="dashboard__copy-btn" onClick={handleCopyLink} aria-label="Copiar link">
            {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={1.5} />}
          </button>
        </div>
        <div className="dashboard__topbar-actions">
          <button className="topbar-icon-btn" aria-label="Notificaciones">
            <span className="topbar-notif-dot" />
            🔔
          </button>
        </div>
      </div>

      {/* Bento grid */}
      <div className="dashboard__bento">

        {/* ── Resumen Mensual ── */}
        <div className="bento-card bento-card--dark bento-span-8">
          <div className="resumen__data">
            <p className="resumen__label">Sesiones este Mes</p>
            <p className="resumen__value">{monthlySessions}</p>
            <p className="resumen__label resumen__label--mt">Alumnos Activos</p>
            <p className="resumen__active">{clientCount}</p>
          </div>
          <div className="resumen__ring">
            <ProgressRing percent={Math.min(100, Math.round((clientCount / 20) * 100)) || 75} />
          </div>
        </div>

        {/* ── Acciones Rápidas ── */}
        <div className="bento-card bento-span-4">
          <p className="bento-card__title">Acciones Rápidas</p>
          <div className="quick-actions">
            <button
              className="quick-action quick-action--primary"
              onClick={() => navigate('/admin/clientes/nuevo')}
            >
              <UserPlus size={16} strokeWidth={1.5} />
              Añadir Nuevo Cliente
            </button>
            <button
              className="quick-action quick-action--secondary"
              onClick={() => navigate('/admin/entrenamientos/rutinas/nueva')}
            >
              <Plus size={16} strokeWidth={1.5} />
              Crear Rutina
            </button>
            <button
              className="quick-action quick-action--secondary"
              onClick={() => navigate('/admin/entrenamientos/ejercicios/nuevo')}
            >
              <CalendarPlus size={16} strokeWidth={1.5} />
              Crear Ejercicio
            </button>
          </div>
        </div>

        {/* ── Check-ins Heatmap ── */}
        <div className="bento-card bento-span-7">
          <div className="bento-card__header">
            <p className="bento-card__title">Check-ins de Clientes (30 Días)</p>
            <button className="bento-card__more"><MoreHorizontal size={16} strokeWidth={1.5} /></button>
          </div>
          <HeatmapGrid activityData={heatmapData} />
        </div>

        {/* ── Próximas Sesiones ── */}
        <div className="bento-card bento-span-5">
          <div className="bento-card__header">
            <p className="bento-card__title">Próximas Sesiones</p>
            <span className="bento-card__link" onClick={() => navigate('/admin/entrenamientos')}>Ver Rutinas</span>
          </div>
          <div className="sessions">
            {loadingSessions ? (
              <p style={{ fontSize: 13, color: 'var(--color-dusty-blue)', padding: '12px 0' }}>Cargando sesiones...</p>
            ) : upcomingSessions.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-dusty-blue)', padding: '12px 0' }}>No hay sesiones programadas.</p>
            ) : (
              upcomingSessions.map(s => {
                const clientName = s.clients ? `${s.clients.nombre} ${s.clients.apellido}`.trim() : 'Alumno'
                return (
                  <div key={s.id} className="session-item">
                    <div className="session-item__icon">🏋️</div>
                    <div className="session-item__info">
                      <p className="session-item__name">{clientName}</p>
                      <p className="session-item__type">{s.nombre} • {s.fecha}</p>
                    </div>
                    <span className="session-item__badge">{s.status === 'completed' ? 'Hecha' : 'Pendiente'}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Clientes Recientes ── */}
        <div className="bento-card bento-span-12">
          <div className="bento-card__header">
            <p className="bento-card__title">Clientes Recientes</p>
            <a href="#" className="bento-card__link" onClick={e => { e.preventDefault(); navigate('/admin/clientes') }}>Ver Todos los Clientes</a>
          </div>
          <div className="recent-clients">
            {loadingClients ? (
              <p style={{ fontSize: 13, color: 'var(--color-dusty-blue)', padding: '12px 0' }}>Cargando alumnos...</p>
            ) : (
              recentClients.map(c => (
                <div key={c.id} className="recent-client-card" onClick={() => navigate('/admin/clientes')}>
                  <div className="recent-client-card__avatar" style={{ background: 'var(--color-ivory)' }}>
                    <span style={{ color: 'var(--color-midnight-blue)', fontWeight: 600 }}>
                      {getInitials(c.nombre, c.apellido)}
                    </span>
                  </div>
                  <p className="recent-client-card__name">{c.nombre} {c.apellido}</p>
                </div>
              ))
            )}
            <div className="recent-client-card recent-client-card--add" onClick={() => navigate('/admin/clientes/nuevo')}>
              <div className="recent-client-card__avatar recent-client-card__avatar--add">
                <Plus size={20} strokeWidth={1.5} />
              </div>
              <p className="recent-client-card__name">Añadir</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
