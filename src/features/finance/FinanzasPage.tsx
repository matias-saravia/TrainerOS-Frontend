import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Ban, ChevronLeft, ChevronRight, Minus, Pencil, Plus, Search, Wallet } from 'lucide-react'
import EmptyState from '../../components/EmptyState'
import ErrorState from '../../components/ErrorState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import { useClients } from '../admin/hooks/useClients'
import { MovementModal, VoidModal } from './MovementModal'
import {
  MONTH_NAMES,
  buildMonths,
  formatMoney,
  formatPeriod,
  groupByDay,
  parsePeriod,
  shiftPeriod,
  type Movement,
  type MovementType,
} from './finance'
import { useMonthMovements, useYearSummary } from './useFinance'
import './FinanzasPage.css'

type ModalState =
  | { kind: 'new'; tipo: MovementType }
  | { kind: 'edit'; movement: Movement }
  | { kind: 'void'; movement: Movement }
  | null

type Filter = 'todos' | 'entrada' | 'salida' | 'anulados'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'entrada', label: 'Entradas' },
  { key: 'salida', label: 'Salidas' },
  { key: 'anulados', label: 'Anulados' },
]

const signedMoney = (amount: number) => (amount < 0 ? `−${formatMoney(-amount)}` : formatMoney(amount))

const formatDay = (fecha: string) =>
  new Date(`${fecha}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' })

/* ── Summary: the year by month ─────────────────────────────────── */
function Resumen({ year, month, onPickMonth }: { year: number; month: number; onPickMonth: (month: number) => void }) {
  const { data: rows = [], isLoading, error, refetch } = useYearSummary(year)
  const months = useMemo(() => buildMonths(rows), [rows])

  if (isLoading) return <LoadingSkeleton count={4} variant="list" />
  if (error) return <ErrorState message="No pudimos cargar el resumen." onRetry={() => refetch()} />

  const selected = months[month - 1]
  const yearIn = months.reduce((sum, m) => sum + m.entradas, 0)
  const yearOut = months.reduce((sum, m) => sum + m.salidas, 0)
  const max = Math.max(1, ...months.flatMap(m => [m.entradas, m.salidas]))
  const now = new Date()

  return (
    <>
      <section className="fin-strip" aria-label={`Resumen de ${MONTH_NAMES[month - 1]}`}>
        <div className="fin-strip__cell">
          <p className="fin-strip__value">{formatMoney(selected.entradas)}</p>
          <p className="fin-strip__label">Entradas de {MONTH_NAMES[month - 1].toLowerCase()}</p>
        </div>
        <div className="fin-strip__cell">
          <p className="fin-strip__value">{formatMoney(selected.salidas)}</p>
          <p className="fin-strip__label">Salidas</p>
        </div>
        <div className="fin-strip__cell">
          <p className={`fin-strip__value${selected.saldo < 0 ? ' fin-strip__value--neg' : ''}`}>{signedMoney(selected.saldo)}</p>
          <p className="fin-strip__label">Saldo del mes</p>
        </div>
      </section>

      <section className="sheet fin-year">
          <div className="sheet__head">
            <h2 className="sheet__title">{year} por mes</h2>
          </div>
          <table className="hoja fin-months">
            <thead>
              <tr>
                <th>Mes</th>
                <th className="hoja__end">Entradas</th>
                <th className="hoja__end">Salidas</th>
                <th className="hoja__end">Saldo</th>
                <th className="fin-months__chart">
                  <span className="fin-legend fin-legend--entrada">Entradas</span>
                  <span className="fin-legend fin-legend--salida">Salidas</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {months.map(m => (
                <tr
                  key={m.mes}
                  data-clickable
                  className={m.mes === month ? 'fin-months__on' : undefined}
                  onClick={() => onPickMonth(m.mes)}
                >
                  <td className="hoja__name">
                    <button type="button" className="fin-months__pick" aria-current={m.mes === month ? 'true' : undefined}>
                      {MONTH_NAMES[m.mes - 1]}
                      {year === now.getFullYear() && m.mes === now.getMonth() + 1 && <small> hoy</small>}
                    </button>
                  </td>
                  <td className="hoja__end">{m.entradas ? formatMoney(m.entradas) : '—'}</td>
                  <td className="hoja__end">{m.salidas ? formatMoney(m.salidas) : '—'}</td>
                  <td className={`hoja__end fin-months__saldo${m.saldo < 0 ? ' fin-neg' : ''}`}>
                    {m.movimientos ? signedMoney(m.saldo) : '—'}
                  </td>
                  <td className="fin-months__chart" aria-hidden="true">
                    <span className="fin-bar fin-bar--entrada" style={{ width: `${(m.entradas / max) * 100}%` }} />
                    <span className="fin-bar fin-bar--salida" style={{ width: `${(m.salidas / max) * 100}%` }} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td className="hoja__end">{formatMoney(yearIn)}</td>
                <td className="hoja__end">{formatMoney(yearOut)}</td>
                <td className={`hoja__end fin-months__saldo${yearIn - yearOut < 0 ? ' fin-neg' : ''}`}>{signedMoney(yearIn - yearOut)}</td>
                <td className="fin-months__chart" aria-hidden="true" />
              </tr>
            </tfoot>
          </table>
      </section>
    </>
  )
}

/* ── Daily ledger ───────────────────────────────────────────────── */
function Libro({ year, month, onModal }: { year: number; month: number; onModal: (state: ModalState) => void }) {
  const { data: movements = [], isLoading, error, refetch } = useMonthMovements(year, month)
  const { data: clients = [] } = useClients()
  const [filter, setFilter] = useState<Filter>('todos')
  const [search, setSearch] = useState('')

  const days = useMemo(() => {
    const query = search.trim().toLowerCase()
    return groupByDay(
      movements.filter(m => {
        if (filter === 'anulados' ? !m.anulado_at : filter !== 'todos' && m.tipo !== filter) return false
        return !query || `${m.concepto} ${m.metodo_pago}`.toLowerCase().includes(query)
      })
    )
  }, [movements, filter, search])

  if (error) return <ErrorState message="No pudimos cargar el libro." onRetry={() => refetch()} />

  return (
    <section className="sheet fin-libro">
      <div className="sheet__head fin-libro__head">
        <div className="tab-row" role="tablist" aria-label="Filtrar movimientos">
          {FILTERS.map(f => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              className={`tab-btn${filter === f.key ? ' tab-btn--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="fin-search">
          <Search size={16} strokeWidth={1.75} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar concepto"
            aria-label="Buscar concepto"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </label>
      </div>

      {isLoading ? (
        <LoadingSkeleton count={4} variant="list" />
      ) : days.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={movements.length === 0 ? 'Sin movimientos este mes' : 'Nada coincide con el filtro'}
          description={movements.length === 0 ? 'Cargá la primera entrada o salida de este mes.' : 'Probá con otro filtro o búsqueda.'}
          action={movements.length === 0 ? { label: 'Nueva entrada', onClick: () => onModal({ kind: 'new', tipo: 'entrada' }) } : undefined}
        />
      ) : (
        <table className="hoja fin-table">
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Método</th>
              <th className="hoja__end">Monto</th>
              <th className="hoja__end"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          {days.map(day => (
            <tbody key={day.fecha}>
              <tr className="fin-day">
                <th colSpan={2} scope="rowgroup">{formatDay(day.fecha)}</th>
                <td colSpan={2} className="hoja__end">
                  {day.entradas > 0 && <span className="fin-pos">+{formatMoney(day.entradas)}</span>}
                  {day.salidas > 0 && <span className="fin-neg">−{formatMoney(day.salidas)}</span>}
                </td>
              </tr>
              {day.movements.map(m => {
                const voided = Boolean(m.anulado_at)
                const client = clients.find(c => c.id === m.client_id)
                return (
                  <tr key={m.id} className={voided ? 'fin-voided' : undefined}>
                    <td className="fin-table__concept">
                      <span className="hoja__name">{m.concepto}</span>
                      {client && <span className="fin-table__client">{client.nombre} {client.apellido}</span>}
                      {voided && <small>Anulado: {m.anulado_motivo}</small>}
                    </td>
                    <td className="fin-table__method">{m.metodo_pago}</td>
                    <td className={`hoja__end fin-table__amount ${m.tipo === 'entrada' ? 'fin-pos' : 'fin-neg'}`}>
                      {m.tipo === 'entrada' ? '+' : '−'}{formatMoney(Number(m.monto))}
                    </td>
                    <td className="hoja__end fin-table__tools">
                      {!voided && (
                        <>
                          <button
                            className="icon-action-btn"
                            title="Editar"
                            aria-label={`Editar ${m.concepto}`}
                            onClick={() => onModal({ kind: 'edit', movement: m })}
                          >
                            <Pencil size={16} strokeWidth={1.5} />
                          </button>
                          <button
                            className="icon-action-btn icon-action-btn--danger"
                            title="Anular"
                            aria-label={`Anular ${m.concepto}`}
                            onClick={() => onModal({ kind: 'void', movement: m })}
                          >
                            <Ban size={16} strokeWidth={1.5} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          ))}
        </table>
      )}
    </section>
  )
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function FinanzasPage() {
  const [params, setParams] = useSearchParams()
  const [modal, setModal] = useState<ModalState>(null)

  const view = params.get('vista') === 'libro' ? 'libro' : 'resumen'
  const { year, month } = parsePeriod(params.get('mes'))

  const go = (next: { view?: string; year?: number; month?: number }) => {
    setParams({
      vista: next.view ?? view,
      mes: formatPeriod(next.year ?? year, next.month ?? month),
    }, { replace: true })
  }

  const shift = (delta: number) => go(shiftPeriod(year, month, delta))

  return (
    <div className="finanzas">
      <header className="page-header">
        <h1 className="page-header__title">Finanzas</h1>
        <div className="finanzas__actions">
          <button className="btn-primary" onClick={() => setModal({ kind: 'new', tipo: 'entrada' })}>
            <Plus size={16} strokeWidth={1.75} />
            Nueva entrada
          </button>
          <button className="btn-secondary" onClick={() => setModal({ kind: 'new', tipo: 'salida' })}>
            <Minus size={16} strokeWidth={1.75} />
            Nueva salida
          </button>
        </div>
      </header>

      <div className="finanzas__bar">
        <div className="tab-row" role="tablist" aria-label="Vista de finanzas">
          <button role="tab" aria-selected={view === 'resumen'} className={`tab-btn${view === 'resumen' ? ' tab-btn--active' : ''}`} onClick={() => go({ view: 'resumen' })}>
            Resumen
          </button>
          <button role="tab" aria-selected={view === 'libro'} className={`tab-btn${view === 'libro' ? ' tab-btn--active' : ''}`} onClick={() => go({ view: 'libro' })}>
            Libro diario
          </button>
        </div>
        <div className="finanzas__period">
          <button className="icon-action-btn" aria-label="Mes anterior" onClick={() => shift(-1)}>
            <ChevronLeft size={20} strokeWidth={1.75} />
          </button>
          <strong aria-live="polite">{MONTH_NAMES[month - 1]} {year}</strong>
          <button className="icon-action-btn" aria-label="Mes siguiente" onClick={() => shift(1)}>
            <ChevronRight size={20} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {view === 'resumen' ? (
        <Resumen year={year} month={month} onPickMonth={m => go({ month: m })} />
      ) : (
        <Libro year={year} month={month} onModal={setModal} />
      )}

      {(modal?.kind === 'new' || modal?.kind === 'edit') && (
        <MovementModal
          tipo={modal.kind === 'new' ? modal.tipo : 'entrada'}
          movement={modal.kind === 'edit' ? modal.movement : undefined}
          onClose={() => setModal(null)}
          onSaved={fecha => {
            setModal(null)
            // Show the month the movement landed in
            go({ year: Number(fecha.slice(0, 4)), month: Number(fecha.slice(5, 7)) })
          }}
        />
      )}
      {modal?.kind === 'void' && <VoidModal movement={modal.movement} onClose={() => setModal(null)} />}
    </div>
  )
}
