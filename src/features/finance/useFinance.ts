import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { InsertTables, UpdateTables } from '../../lib/supabase'
import { financeKeys } from '../../lib/queryKeys'
import { monthRange, type Movement, type SummaryRow } from './finance'

/**
 * Hook to fetch one month of the ledger, voided movements included, latest first.
 */
export function useMonthMovements(year: number, month: number) {
  return useQuery({
    queryKey: financeKeys.month(year, month),
    queryFn: async (): Promise<Movement[]> => {
      const { from, to } = monthRange(year, month)
      const { data, error } = await supabase
        .from('finance_movements')
        .select('*')
        .gte('fecha', from)
        .lt('fecha', to)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return data ?? []
    },
  })
}

/**
 * Hook to fetch the totals of a year by month and type.
 */
export function useYearSummary(year: number) {
  return useQuery({
    queryKey: financeKeys.summary(year),
    queryFn: async (): Promise<SummaryRow[]> => {
      const { data, error } = await supabase.rpc('finance_year_summary', { p_year: year })

      if (error) {
        throw error
      }

      return data ?? []
    },
  })
}

export function useSaveMovement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: InsertTables<'finance_movements'> }): Promise<void> => {
      const { error } = id
        ? await supabase.from('finance_movements').update(data).eq('id', id)
        : await supabase.from('finance_movements').insert(data)

      if (error) {
        throw error
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  })
}

export function useVoidMovement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }): Promise<void> => {
      const update: UpdateTables<'finance_movements'> = {
        anulado_at: new Date().toISOString(),
        anulado_motivo: motivo,
      }
      const { error } = await supabase.from('finance_movements').update(update).eq('id', id)

      if (error) {
        throw error
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  })
}
