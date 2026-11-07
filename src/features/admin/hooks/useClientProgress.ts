import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { clientKeys } from '../../../lib/queryKeys'
import type { ProgressSession, ProgressWeight } from '../progress'

/**
 * Hook to fetch a student's sessions, newest first, with how far each one got,
 * the effort and the comment the student left.
 */
export function useClientSessions(clientId: string) {
  return useQuery({
    queryKey: [...clientKeys.detail(clientId), 'sessions'],
    queryFn: async (): Promise<ProgressSession[]> => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('id, nombre, fecha, status, esfuerzo, notes, session_exercises(series, sets_completados)')
        .eq('client_id', clientId)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(120)

      if (error) {
        throw error
      }

      return (data as unknown as ProgressSession[]) ?? []
    },
    enabled: Boolean(clientId),
  })
}

/**
 * Hook to fetch every weight a student logged, with the exercise name.
 */
export function useClientWeights(clientId: string) {
  return useQuery({
    queryKey: [...clientKeys.detail(clientId), 'weights'],
    queryFn: async (): Promise<ProgressWeight[]> => {
      const { data, error } = await supabase
        .from('weight_entries')
        .select('fecha, kg, exercise_id, exercises(nombre)')
        .eq('client_id', clientId)
        .order('fecha', { ascending: true })

      if (error) {
        throw error
      }

      return (data as unknown as ProgressWeight[]) ?? []
    },
    enabled: Boolean(clientId),
  })
}
