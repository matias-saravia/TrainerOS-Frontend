import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Plus, X } from 'lucide-react'
import { RestTimerContext, formatClock, useRestTimer } from '../hooks/useRestTimer'
import './RestTimer.css'

/**
 * Keeps the rest countdown in the student layout, so it keeps running while
 * the student moves between the session and an exercise.
 */
export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [total, setTotal] = useState(0)

  const start = useCallback((seconds: number) => {
    if (seconds <= 0) return
    setTotal(seconds)
    setEndsAt(Date.now() + seconds * 1000)
  }, [])

  const add = useCallback((seconds: number) => {
    setTotal(t => t + seconds)
    setEndsAt(e => (e == null ? e : e + seconds * 1000))
  }, [])

  const stop = useCallback(() => setEndsAt(null), [])

  const value = useMemo(() => ({ endsAt, total, start, add, stop }), [endsAt, total, start, add, stop])

  return <RestTimerContext.Provider value={value}>{children}</RestTimerContext.Provider>
}

/** The countdown bar. Renders nothing while no rest is running. */
export default function RestTimer() {
  const { endsAt, total, add, stop } = useRestTimer()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (endsAt == null) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [endsAt])

  const left = endsAt == null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000))
  const finished = endsAt != null && left === 0

  useEffect(() => {
    if (!finished) return
    navigator.vibrate?.([180, 90, 180])
    const id = setTimeout(stop, 4000)
    return () => clearTimeout(id)
  }, [finished, stop])

  if (endsAt == null) return null

  const elapsed = total > 0 ? Math.min(1, 1 - left / total) : 1

  return (
    <div className={`rest-timer${finished ? ' rest-timer--done' : ''}`}>
      <div className="rest-timer__fill" style={{ transform: `scaleX(${elapsed})` }} aria-hidden="true" />
      <p className="rest-timer__text" role="timer" aria-live={finished ? 'assertive' : 'off'}>
        {finished ? (
          <strong>A la próxima serie</strong>
        ) : (
          <>
            <span>Descanso</span>
            <strong>{formatClock(left)}</strong>
          </>
        )}
      </p>
      {!finished && (
        <button type="button" className="rest-timer__btn" onClick={() => add(15)} aria-label="Sumar 15 segundos de descanso">
          <Plus size={16} strokeWidth={2.5} />
          15s
        </button>
      )}
      <button type="button" className="rest-timer__btn" onClick={stop} aria-label="Terminar el descanso">
        <X size={18} strokeWidth={2.5} />
      </button>
    </div>
  )
}
