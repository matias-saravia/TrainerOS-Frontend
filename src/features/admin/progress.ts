// What a trainer reads on a student's progress page, worked out from the
// sessions and the weights the student logged. Dates are local YYYY-MM-DD.

export interface ProgressSession {
  id: string
  nombre: string
  fecha: string
  status: string
  esfuerzo: number | null
  notes: string | null
  session_exercises: { series: number; sets_completados: number }[]
}

export interface ProgressWeight {
  fecha: string
  kg: number
  exercise_id: string
  exercises: { nombre: string } | null
}

export interface WeekCount {
  /** Monday of the week */
  start: string
  sessions: number
}

export interface ExerciseLoad {
  exerciseId: string
  nombre: string
  first: number
  last: number
  best: number
  lastFecha: string
  days: number
}

export function dayKey(date: Date): string {
  return date.toLocaleDateString('en-CA')
}

export function fromKey(key: string): Date {
  return new Date(`${key}T12:00:00`)
}

function mondayOf(date: Date): Date {
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return monday
}

/** A session counts as trained once a set was logged, or when it was finished. */
export function trained(session: ProgressSession): boolean {
  return session.status === 'completed' || session.session_exercises.some(e => e.sets_completados > 0)
}

export function exercisesDone(session: ProgressSession): number {
  return session.session_exercises.filter(e => e.sets_completados >= e.series).length
}

/** Trained sessions in each of the last `weeks` weeks, oldest first, ending this week. */
export function weeklyCounts(sessions: ProgressSession[], today: Date, weeks = 8): WeekCount[] {
  const thisMonday = mondayOf(today)
  return Array.from({ length: weeks }, (_, i) => {
    const start = new Date(thisMonday)
    start.setDate(thisMonday.getDate() - 7 * (weeks - 1 - i))
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    const from = dayKey(start)
    const to = dayKey(end)
    return {
      start: from,
      sessions: sessions.filter(s => trained(s) && s.fecha >= from && s.fecha < to).length,
    }
  })
}

/** Whole days between two dates, ignoring the time of day. */
export function daysBetween(from: string, to: string): number {
  return Math.round((fromKey(to).getTime() - fromKey(from).getTime()) / 86_400_000)
}

/**
 * Per exercise: the heaviest set of the first and the last day it was trained,
 * and the best ever. Most recently trained first.
 */
export function exerciseLoads(weights: ProgressWeight[]): ExerciseLoad[] {
  const byExercise = new Map<string, { nombre: string; days: Map<string, number> }>()

  for (const w of weights) {
    const entry = byExercise.get(w.exercise_id) ?? { nombre: w.exercises?.nombre ?? 'Ejercicio', days: new Map() }
    entry.days.set(w.fecha, Math.max(entry.days.get(w.fecha) ?? 0, Number(w.kg)))
    byExercise.set(w.exercise_id, entry)
  }

  return [...byExercise.entries()]
    .map(([exerciseId, { nombre, days }]) => {
      const ordered = [...days.entries()].sort(([a], [b]) => a.localeCompare(b))
      return {
        exerciseId,
        nombre,
        first: ordered[0][1],
        last: ordered[ordered.length - 1][1],
        best: Math.max(...ordered.map(([, kg]) => kg)),
        lastFecha: ordered[ordered.length - 1][0],
        days: ordered.length,
      }
    })
    .sort((a, b) => b.lastFecha.localeCompare(a.lastFecha) || a.nombre.localeCompare(b.nombre))
}
