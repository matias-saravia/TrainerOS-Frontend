import { describe, expect, it, vi } from 'vitest'
import { toPreviewSession, toSessionExercise, type SessionExerciseWithExercise } from './useClientDashboard'
import type { RoutineBlockWithExercises, RoutineRow } from '../../workouts/hooks/useRoutines'

vi.mock('../../../lib/supabase', () => ({ supabase: {} }))
vi.mock('../../auth', () => ({ useAuth: () => ({ user: null }) }))

const row = (overrides: Partial<SessionExerciseWithExercise> = {}) =>
  ({
    id: 'se-1',
    session_id: 's-1',
    exercise_id: 'ex-1',
    order_index: 0,
    categoria: null,
    series: 3,
    reps: '8-10',
    descanso: 90,
    peso_objetivo: null,
    sets_completados: 1,
    peso_registrado: null,
    notes: null,
    exercises: {
      nombre: 'Press',
      grupo_muscular: 'Pecho',
      instrucciones: ['Paso 1'],
      video_url: '',
    },
    ...overrides,
  }) as SessionExerciseWithExercise

describe('toPreviewSession', () => {
  it('keeps the routine order and starts with no progress', () => {
    const exercise = (id: string, rest_seconds: number | null) => ({
      id,
      exercise_id: `ex-${id}`,
      sets: 3,
      reps: '10',
      rest_seconds,
      notes: null,
      exercises: null,
    })
    const blocks = [
      { routine_block_exercises: [exercise('a', 60), exercise('b', null)] },
      { routine_block_exercises: [exercise('c', 30)] },
    ] as unknown as RoutineBlockWithExercises[]

    const session = toPreviewSession({ id: 'r-1', nombre: 'Empuje' } as RoutineRow, blocks, 'c-1')

    expect(session.client_id).toBe('c-1')
    expect(session.session_exercises.map(e => [e.id, e.order_index, e.descanso, e.sets_completados])).toEqual([
      ['a', 0, 60, 0],
      ['b', 1, 90, 0],
      ['c', 2, 30, 0],
    ])
  })
})

describe('toSessionExercise', () => {
  it('uses the saved progress of the session', () => {
    const exercise = toSessionExercise(row({ sets_completados: 2, peso_registrado: 60 }))
    expect(exercise.setsCompletados).toBe(2)
    expect(exercise.pesoRegistrado).toBe(60)
  })

  it('does not invent a category or a weight', () => {
    const exercise = toSessionExercise(row())
    expect(exercise.categoria).toBeNull()
    expect(exercise.pesoRegistrado).toBeUndefined()
    expect(exercise.pesoObjetivo).toBeUndefined()
  })

  it('treats an empty video as no video', () => {
    expect(toSessionExercise(row()).videoUrl).toBeUndefined()
  })

  it('shows the trainer notes before the general instructions', () => {
    expect(toSessionExercise(row({ notes: 'Cuidá el hombro' })).instrucciones).toEqual([
      'Cuidá el hombro',
      'Paso 1',
    ])
  })

  it('survives an exercise that can no longer be read', () => {
    const exercise = toSessionExercise(row({ exercises: null }))
    expect(exercise.nombre).toBe('Ejercicio')
    expect(exercise.instrucciones).toEqual([])
  })
})
