import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import type { Tables } from '../../../lib/supabase'
import { clientKeys, sessionKeys, clientRoutineKeys } from '../../../lib/queryKeys'
import type { RoutineRow } from '../../workouts/hooks/useRoutines'
import { useAuth } from '../../auth'
import type { SessionExercise } from '../api/client.api'

export type ClientRow = Tables<'clients'>
export type WorkoutSessionRow = Tables<'workout_sessions'>
export type SessionExerciseRow = Tables<'session_exercises'>
export type ExerciseRow = Tables<'exercises'>
export type WeightEntryRow = Tables<'weight_entries'>

export type SessionExerciseWithExercise = SessionExerciseRow & {
  exercises: ExerciseRow | null
}

export type WorkoutSessionWithExercises = WorkoutSessionRow & {
  session_exercises: SessionExerciseWithExercise[]
}

export function toSessionExercise(row: SessionExerciseWithExercise): SessionExercise {
  const instrucciones = [
    ...(row.notes ? [row.notes] : []),
    ...(row.exercises?.instrucciones ?? []),
  ]

  return {
    id: row.id,
    ejercicioId: row.exercise_id,
    nombre: row.exercises?.nombre ?? 'Ejercicio',
    grupoMuscular: row.exercises?.grupo_muscular ?? '',
    categoria: row.categoria,
    series: row.series,
    reps: row.reps,
    descanso: row.descanso,
    pesoObjetivo: row.peso_objetivo ?? undefined,
    instrucciones,
    videoUrl: row.exercises?.video_url || undefined,
    setsCompletados: row.sets_completados,
    pesoRegistrado: row.peso_registrado ?? undefined,
  }
}

/**
 * Hook to fetch the client row linked to the signed-in student.
 * Returns null while the account has not been linked to any trainer.
 */
export function useMyClient() {
  const { user } = useAuth()
  const userId = user?.id ?? ''

  return useQuery({
    queryKey: clientKeys.me(userId),
    queryFn: async (): Promise<ClientRow | null> => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        throw error
      }

      return data
    },
    enabled: Boolean(userId),
  })
}

/**
 * Hook to fetch one workout session with its exercises, in routine order.
 */
export function useWorkoutSession(sessionId: string) {
  return useQuery({
    queryKey: sessionKeys.detail(sessionId),
    queryFn: async (): Promise<WorkoutSessionWithExercises> => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*, session_exercises(*, exercises(*))')
        .eq('id', sessionId)
        .order('order_index', { referencedTable: 'session_exercises' })
        .single()

      if (error) {
        throw error
      }

      return data as unknown as WorkoutSessionWithExercises
    },
    enabled: Boolean(sessionId),
  })
}

/**
 * Hook to fetch weight entries for a specific client + exercise combo,
 * ordered by date ascending.
 */
export function useWeightHistory(clientId: string, exerciseId: string) {
  return useQuery({
    queryKey: clientKeys.weightHistory(clientId, exerciseId),
    queryFn: async (): Promise<WeightEntryRow[]> => {
      const { data, error } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('client_id', clientId)
        .eq('exercise_id', exerciseId)
        .order('fecha', { ascending: true })

      if (error) {
        throw error
      }

      return data ?? []
    },
    enabled: Boolean(clientId && exerciseId),
  })
}

/**
 * Mutation hook to start a session of an assigned routine, or resume the open one.
 * Returns the session ID.
 */
export function useStartWorkoutSession() {
  return useMutation({
    mutationFn: async (routineId: string): Promise<string> => {
      const { data, error } = await supabase.rpc('start_workout_session', {
        p_routine_id: routineId,
        p_fecha: new Date().toLocaleDateString('en-CA'), // device's local YYYY-MM-DD
      })

      if (error) {
        throw error
      }

      return data
    },
  })
}

/**
 * Mutation hook to count one finished set. The server is the source of truth:
 * progress only moves on screen once it has been saved.
 */
export function useLogWorkoutSet(sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, kg }: { id: string; kg?: number }): Promise<void> => {
      const { error } = await supabase.rpc('log_workout_set', {
        p_session_exercise_id: id,
        p_kg: kg,
      })

      if (error) {
        throw error
      }
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) }),
        queryClient.invalidateQueries({ queryKey: clientKeys.all }),
      ]),
  })
}

/**
 * Mutation hook to mark a session as completed.
 */
export function useCompleteWorkoutSession(sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase.rpc('complete_workout_session', {
        p_session_id: sessionId,
      })

      if (error) {
        throw error
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) }),
  })
}

export type AssignedRoutineRow = {
  id: string
  client_id: string
  routine_id: string
  assigned_at: string
  routines: RoutineRow | null
}

/**
 * Hook to fetch routines assigned to a client (for the alumno dashboard).
 * Joins client_routines with routines table to get full routine details.
 */
export function useClientAssignedRoutines(clientId: string) {
  return useQuery({
    queryKey: clientRoutineKeys.byClient(clientId),
    queryFn: async (): Promise<AssignedRoutineRow[]> => {
      const { data, error } = await supabase
        .from('client_routines')
        .select('*, routines(*)')
        .eq('client_id', clientId)
        .order('assigned_at', { ascending: false })

      if (error) {
        throw error
      }

      return (data as unknown as AssignedRoutineRow[]) ?? []
    },
    enabled: Boolean(clientId),
  })
}
