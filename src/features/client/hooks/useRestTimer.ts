import { createContext, useContext } from 'react'

export interface RestTimerValue {
  endsAt: number | null
  total: number
  start: (seconds: number) => void
  add: (seconds: number) => void
  stop: () => void
}

export const RestTimerContext = createContext<RestTimerValue | null>(null)

export function useRestTimer() {
  const value = useContext(RestTimerContext)
  if (!value) throw new Error('useRestTimer must be used inside RestTimerProvider')
  return value
}

export function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
