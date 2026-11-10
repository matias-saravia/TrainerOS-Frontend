import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { clientKeys } from '../../../lib/queryKeys'
import type { ProgressSession, ProgressWeight } from '../progress'

/**
 * Hook to fetch a student's sessions, newest first, with how far each one got,
 * the effort, the comment the student left and the trainer's reply.
 */
export function useClientSessions(clientId: string) {
  return useQuery({
    queryKey: [...clientKeys.detail(clientId), 'sessions'],
    queryFn: async (): Promise<ProgressSession[]> => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('id, nombre, fecha, status, esfuerzo, notes, respuesta, session_exercises(series, sets_completados)')
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

// Supabase returns at most 1000 rows per request
const PAGE_SIZE = 1000

/**
 * Hook to fetch every weight a student logged, with the exercise name.
 * Reads page by page, so a long history never loses its latest entries.
 */
export function useClientWeights(clientId: string) {
  return useQuery({
    queryKey: [...clientKeys.detail(clientId), 'weights'],
    queryFn: async (): Promise<ProgressWeight[]> => {
      const all: ProgressWeight[] = []

      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from('weight_entries')
          .select('fecha, kg, exercise_id, exercises(nombre)')
          .eq('client_id', clientId)
          .order('fecha', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1)

        if (error) {
          throw error
        }

        all.push(...((data as unknown as ProgressWeight[]) ?? []))
        if (!data || data.length < PAGE_SIZE) return all
      }
    },
    enabled: Boolean(clientId),
  })
}

/**
 * Mutation hook to answer the comment a student left on a session.
 * An empty text removes the reply.
 */
export function useReplyToSession(clientId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sessionId, respuesta }: { sessionId: string; respuesta: string }): Promise<void> => {
      const { error } = await supabase.rpc('reply_to_session', {
        p_session_id: sessionId,
        p_respuesta: respuesta.trim(),
      })

      if (error) {
        throw error
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...clientKeys.detail(clientId), 'sessions'] }),
  })
}
