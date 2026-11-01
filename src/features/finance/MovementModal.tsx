import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../auth'
import { useClients } from '../admin/hooks/useClients'
import { PAYMENT_METHODS, formatMoney, today, type Movement, type MovementType } from './finance'
import { useSaveMovement, useVoidMovement } from './useFinance'

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fin-modal-overlay"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="fin-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__head">
          <h2 className="sheet__title">{title}</h2>
          <button type="button" className="icon-action-btn" aria-label="Cerrar" onClick={onClose}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

interface MovementModalProps {
  tipo: MovementType
  movement?: Movement
  onClose: () => void
  onSaved: (fecha: string) => void
}

export function MovementModal({ tipo: initialTipo, movement, onClose, onSaved }: MovementModalProps) {
  const { user } = useAuth()
  const { data: clients = [] } = useClients()
  const save = useSaveMovement()

  const [tipo, setTipo] = useState<MovementType>((movement?.tipo as MovementType) ?? initialTipo)
  const [concepto, setConcepto] = useState(movement?.concepto ?? '')
  const [monto, setMonto] = useState(movement ? String(movement.monto) : '')
  const [fecha, setFecha] = useState(movement?.fecha ?? today())
  const [metodo, setMetodo] = useState(movement?.metodo_pago ?? PAYMENT_METHODS[0])
  const [clientId, setClientId] = useState(movement?.client_id ?? '')
  const [error, setError] = useState<string | null>(null)

  const changeTipo = (next: MovementType) => {
    setTipo(next)
    if (next === 'salida') setClientId('')
  }

  const changeClient = (id: string) => {
    setClientId(id)
    const client = clients.find(c => c.id === id)
    if (client && !concepto.trim()) setConcepto(`Pago de ${client.nombre} ${client.apellido}`.trim())
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const amount = Number(monto)
    if (!concepto.trim()) {
      setError('Escribí un concepto, por ejemplo "Mensualidad de noviembre".')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Escribí un monto mayor a cero.')
      return
    }
    if (!fecha) {
      setError('Elegí la fecha del movimiento.')
      return
    }
    if (!user) return

    setError(null)
    try {
      await save.mutateAsync({
        id: movement?.id,
        data: {
          trainer_id: user.id,
          tipo,
          concepto: concepto.trim(),
          monto: amount,
          fecha,
          metodo_pago: metodo,
          client_id: clientId || null,
        },
      })
      onSaved(fecha)
    } catch (err) {
      console.error('Error saving movement:', err)
      setError('No pudimos guardar el movimiento. Revisá tu conexión e intentá de nuevo.')
    }
  }

  return (
    <Modal title={movement ? 'Editar movimiento' : tipo === 'entrada' ? 'Nueva entrada' : 'Nueva salida'} onClose={onClose}>
      <form className="fin-form" onSubmit={handleSubmit} noValidate>
        {error && <div className="alert" role="alert">{error}</div>}

        <div className="fin-segmented" role="radiogroup" aria-label="Tipo de movimiento">
          {(['entrada', 'salida'] as const).map(value => (
            <label key={value} className={tipo === value ? 'fin-segmented__on' : undefined}>
              <input type="radio" name="tipo" checked={tipo === value} onChange={() => changeTipo(value)} />
              {value === 'entrada' ? 'Entrada' : 'Salida'}
            </label>
          ))}
        </div>

        <div className="fin-form__row">
          <label className="fin-field">
            Monto
            <input
              className="fin-input fin-input--amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              autoFocus
            />
          </label>
          <label className="fin-field">
            Fecha
            <input className="fin-input" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </label>
        </div>

        {tipo === 'entrada' && (
          <label className="fin-field">
            Alumno (opcional)
            <select className="fin-input" value={clientId} onChange={e => changeClient(e.target.value)}>
              <option value="">Sin alumno</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
              ))}
            </select>
          </label>
        )}

        <label className="fin-field">
          Concepto
          <input
            className="fin-input"
            type="text"
            maxLength={120}
            placeholder={tipo === 'entrada' ? 'Ej. Mensualidad, o 4 meses de preparación' : 'Ej. Alquiler del gimnasio'}
            value={concepto}
            onChange={e => setConcepto(e.target.value)}
          />
        </label>

        <label className="fin-field">
          Método
          <select className="fin-input" value={metodo} onChange={e => setMetodo(e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
        </label>

        <div className="fin-form__actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending ? 'Guardando...' : 'Guardar movimiento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function VoidModal({ movement, onClose }: { movement: Movement; onClose: () => void }) {
  const voidMovement = useVoidMovement()
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!motivo.trim()) {
      setError('Escribí por qué lo anulás, para que quede en el libro.')
      return
    }
    setError(null)
    try {
      await voidMovement.mutateAsync({ id: movement.id, motivo: motivo.trim() })
      onClose()
    } catch (err) {
      console.error('Error voiding movement:', err)
      setError('No pudimos anular el movimiento. Revisá tu conexión e intentá de nuevo.')
    }
  }

  return (
    <Modal title="Anular movimiento" onClose={onClose}>
      <form className="fin-form" onSubmit={handleSubmit} noValidate>
        {error && <div className="alert" role="alert">{error}</div>}
        <p>
          <strong>{movement.concepto}</strong> por {formatMoney(Number(movement.monto))} deja de contar en los totales,
          pero sigue en el libro como anulado. No se puede deshacer.
        </p>
        <label className="fin-field">
          Motivo
          <input
            className="fin-input"
            type="text"
            maxLength={200}
            placeholder="Ej. Lo cargué dos veces"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            autoFocus
          />
        </label>
        <div className="fin-form__actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-danger-outline" disabled={voidMovement.isPending}>
            {voidMovement.isPending ? 'Anulando...' : 'Anular movimiento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
