import type { WeightEntry } from '../api/client.api'
import './ExerciseHistoryChart.css'

interface ExerciseHistoryChartProps {
  historial: WeightEntry[]
  label?: string
}

export default function ExerciseHistoryChart({
  historial,
  label = 'Historial',
}: ExerciseHistoryChartProps) {
  if (!historial || historial.length === 0) return null

  const recent = historial.slice(-5)
  const maxKg = Math.max(...recent.map(e => e.kg))
  const minKg = Math.min(...recent.map(e => e.kg))
  const range = maxKg - minKg || 1

  const BAR_MAX_H = 80  // px
  const BAR_W = 32
  const GAP = 16
  const CHART_W = recent.length * (BAR_W + GAP) - GAP

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getDate()}/${d.getMonth() + 1}`
  }

  return (
    <div className="history-chart">
      <h3 className="history-chart__title">{label}</h3>
      <div className="history-chart__canvas-wrap">
        <svg
          className="history-chart__svg"
          viewBox={`0 0 ${CHART_W + 8} ${BAR_MAX_H + 48}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          aria-label={label}
          role="img"
        >
          {recent.map((entry, i) => {
            const barH = ((entry.kg - minKg) / range) * (BAR_MAX_H * 0.7) + BAR_MAX_H * 0.3
            const x = i * (BAR_W + GAP)
            const y = BAR_MAX_H - barH
            const isLatest = i === recent.length - 1

            return (
              <g key={entry.fecha}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={BAR_W}
                  height={barH}
                  rx={1}
                  fill={isLatest ? 'var(--color-marker)' : 'var(--color-ivory)'}
                />
                {/* Value label above bar */}
                <text
                  x={x + BAR_W / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="800"
                  fontFamily="var(--font-display)"
                  fill={'currentColor'}
                >
                  {entry.kg}
                </text>
                {/* Date label below bar */}
                <text
                  x={x + BAR_W / 2}
                  y={BAR_MAX_H + 18}
                  textAnchor="middle"
                  fontSize="11"
                  fontFamily="var(--font-body)"
                  fill="currentColor"
                >
                  {formatDate(entry.fecha)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
