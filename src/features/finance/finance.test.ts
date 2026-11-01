import { describe, expect, it } from 'vitest'
import { buildMonths, formatMoney, groupByDay, monthRange, parsePeriod, shiftPeriod, type Movement } from './finance'

const rows = [
  { mes: 3, tipo: 'entrada', total: 3500, movimientos: 3 },
  { mes: 3, tipo: 'salida', total: 4000, movimientos: 1 },
  { mes: 12, tipo: 'salida', total: 10.5, movimientos: 1 },
]

const movement = (overrides: Partial<Movement>) =>
  ({ fecha: '2026-03-10', tipo: 'entrada', monto: 100, anulado_at: null, ...overrides }) as Movement

describe('buildMonths', () => {
  it('returns all twelve months, with a balance that can go negative', () => {
    const months = buildMonths(rows)
    expect(months).toHaveLength(12)
    expect(months[2]).toEqual({ mes: 3, entradas: 3500, salidas: 4000, saldo: -500, movimientos: 4 })
    expect(months[0].saldo).toBe(0)
    expect(months[11].saldo).toBe(-10.5)
  })
})

describe('groupByDay', () => {
  it('lists voided movements without counting them', () => {
    const [day] = groupByDay([
      movement({ monto: 100 }),
      movement({ tipo: 'salida', monto: 30 }),
      movement({ monto: 999, anulado_at: '2026-03-11T00:00:00Z' }),
    ])
    expect(day.movements).toHaveLength(3)
    expect(day.entradas).toBe(100)
    expect(day.salidas).toBe(30)
  })

  it('puts the latest day first', () => {
    const days = groupByDay([movement({ fecha: '2026-03-01' }), movement({ fecha: '2026-03-20' })])
    expect(days.map(d => d.fecha)).toEqual(['2026-03-20', '2026-03-01'])
  })
})

describe('formatMoney', () => {
  it('shows cents only when there are any, and always two digits', () => {
    expect(formatMoney(480000)).toMatch(/480.000$/)
    expect(formatMoney(480000.5)).toMatch(/480.000,50$/)
  })
})

describe('periods', () => {
  it('crosses year boundaries', () => {
    expect(shiftPeriod(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
    expect(shiftPeriod(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
    expect(monthRange(2026, 12)).toEqual({ from: '2026-12-01', to: '2027-01-01' })
  })

  it('reads a valid month from the URL and ignores anything else', () => {
    expect(parsePeriod('2026-03')).toEqual({ year: 2026, month: 3 })
    const now = new Date()
    expect(parsePeriod('2026-13')).toEqual({ year: now.getFullYear(), month: now.getMonth() + 1 })
  })
})
