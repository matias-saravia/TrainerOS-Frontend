import type { WeightEntry } from '../api/client.api'
import './ExerciseHistoryChart.css'

interface ExerciseHistoryChartProps {
  historial: WeightEntry[]
  label?: string
}

/** Heaviest weight of each of the last days trained, as fixed-size columns. */
export default function ExerciseHistoryChart({
  historial,
  label = 'Historial',
}: ExerciseHistoryChartProps) {
  if (!historial || historial.length === 0) return null

  const recent = historial.slice(-6)
  const maxKg = Math.max(...recent.map(e => e.kg))
  const minKg = Math.min(...recent.map(e => e.kg))
  const range = maxKg - minKg

  // A plain YYYY-MM-DD: parsing it as a Date would shift it to the previous day west of UTC
  const formatDate = (iso: string) => {
    const [, month, day] = iso.split('-').map(Number)
    return `${day}/${month}`
  }

  return (
    <section className="history-chart" aria-label={label}>
      <h2 className="history-chart__title">{label}</h2>
      <ol className="history-chart__bars">
        {recent.map((entry, i) => {
          // The lightest day keeps a visible bar; the rest grow with the weight
          const height = range === 0 ? 100 : 30 + ((entry.kg - minKg) / range) * 70
          return (
            <li
              key={entry.fecha}
              className={`history-chart__day${i === recent.length - 1 ? ' history-chart__day--last' : ''}`}
            >
              <span className="history-chart__kg">{entry.kg.toLocaleString('es-AR')}</span>
              <span className="history-chart__bar" style={{ height: `${height}%` }} aria-hidden="true" />
              <span className="history-chart__date">{formatDate(entry.fecha)}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
