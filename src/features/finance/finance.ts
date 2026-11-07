import type { Tables } from '../../lib/supabase'
import { dayKey } from '../../utils/dates'

export type Movement = Tables<'finance_movements'>
export type MovementType = 'entrada' | 'salida'

export const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'MercadoPago', 'Débito', 'Crédito']

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export interface SummaryRow {
  mes: number
  tipo: string
  total: number
  movimientos: number
}

export interface MonthSummary {
  mes: number
  entradas: number
  salidas: number
  saldo: number
  movimientos: number
}

/** One line per month of the year, empty months included. */
export function buildMonths(rows: SummaryRow[]): MonthSummary[] {
  const months: MonthSummary[] = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    entradas: 0,
    salidas: 0,
    saldo: 0,
    movimientos: 0,
  }))

  for (const row of rows) {
    const month = months[row.mes - 1]
    const total = Number(row.total)
    if (row.tipo === 'entrada') month.entradas += total
    else month.salidas += total
    month.saldo = month.entradas - month.salidas
    month.movimientos += Number(row.movimientos)
  }

  return months
}

export interface LedgerDay {
  fecha: string
  entradas: number
  salidas: number
  movements: Movement[]
}

/** Groups a month's movements by day. Voided movements are listed but do not count. */
export function groupByDay(movements: Movement[]): LedgerDay[] {
  const days = new Map<string, LedgerDay>()

  for (const movement of movements) {
    let day = days.get(movement.fecha)
    if (!day) {
      day = { fecha: movement.fecha, entradas: 0, salidas: 0, movements: [] }
      days.set(movement.fecha, day)
    }
    day.movements.push(movement)
    if (!movement.anulado_at) {
      if (movement.tipo === 'entrada') day.entradas += Number(movement.monto)
      else day.salidas += Number(movement.monto)
    }
  }

  return [...days.values()].sort((a, b) => b.fecha.localeCompare(a.fecha))
}

const money = (decimals: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
const wholeMoney = money(0)
const centsMoney = money(2)

export const formatMoney = (amount: number) =>
  (Number.isInteger(amount) ? wholeMoney : centsMoney).format(amount)

export const today = () => dayKey(new Date())

/** Parses "2026-11" from the URL, falling back to the current month. */
export function parsePeriod(value: string | null): { year: number; month: number } {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value ?? '')
  if (match) return { year: Number(match[1]), month: Number(match[2]) }
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export const formatPeriod = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`

export function shiftPeriod(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

/** First day of the month and first day of the next one, as dates. */
export function monthRange(year: number, month: number) {
  const next = shiftPeriod(year, month, 1)
  return {
    from: `${formatPeriod(year, month)}-01`,
    to: `${formatPeriod(next.year, next.month)}-01`,
  }
}
