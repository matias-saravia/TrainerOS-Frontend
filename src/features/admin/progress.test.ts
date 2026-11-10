import { describe, expect, it } from 'vitest'
import { daysBetween, exerciseLoads, weeklyCounts, type ProgressSession, type ProgressWeight } from './progress'

const session = (fecha: string, status: string, setsDone = 0): ProgressSession => ({
  id: fecha + status,
  nombre: 'Empuje',
  fecha,
  status,
  esfuerzo: null,
  notes: null,
  respuesta: null,
  session_exercises: [{ series: 3, sets_completados: setsDone }],
})

describe('weeklyCounts', () => {
  // Thursday 5 November 2026: its week starts on Monday the 2nd
  const today = new Date('2026-11-05T15:00:00')

  it('counts trained sessions per week, oldest first, ending this week', () => {
    const counts = weeklyCounts(
      [session('2026-11-02', 'completed'), session('2026-11-05', 'in-progress', 1), session('2026-10-30', 'completed')],
      today,
      2,
    )
    expect(counts).toEqual([
      { start: '2026-10-26', sessions: 1 },
      { start: '2026-11-02', sessions: 2 },
    ])
  })

  it('leaves out sessions opened without a single set', () => {
    expect(weeklyCounts([session('2026-11-03', 'in-progress', 0)], today, 1)).toEqual([
      { start: '2026-11-02', sessions: 0 },
    ])
  })
})

describe('exerciseLoads', () => {
  const w = (exercise_id: string, fecha: string, kg: number): ProgressWeight => ({
    exercise_id,
    fecha,
    kg,
    exercises: { nombre: exercise_id === 'a' ? 'Press' : 'Sentadilla' },
  })

  it('compares the heaviest set of the first and last day, newest exercise first', () => {
    const loads = exerciseLoads([
      w('a', '2026-10-01', 40),
      w('a', '2026-10-01', 45),
      w('a', '2026-10-20', 50),
      w('a', '2026-10-27', 47.5),
      w('b', '2026-11-01', 80),
    ])
    expect(loads).toEqual([
      { exerciseId: 'b', nombre: 'Sentadilla', first: 80, last: 80, best: 80, lastFecha: '2026-11-01', days: 1 },
      { exerciseId: 'a', nombre: 'Press', first: 45, last: 47.5, best: 50, lastFecha: '2026-10-27', days: 3 },
    ])
  })
})

describe('daysBetween', () => {
  it('counts calendar days, across a month', () => {
    expect(daysBetween('2026-10-30', '2026-11-05')).toBe(6)
    expect(daysBetween('2026-11-05', '2026-11-05')).toBe(0)
  })
})
