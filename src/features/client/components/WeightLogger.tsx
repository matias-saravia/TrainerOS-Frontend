import { useEffect, useRef, useState } from 'react'
import { Check, Undo2 } from 'lucide-react'
import './WeightLogger.css'

const formatKg = (kg: number) => kg.toLocaleString('es-AR')

interface WeightLoggerProps {
  targetKg?: number
  lastKg?: number
  /** Weight logged for this exercise in an earlier session */
  previousKg?: number
  setsTotal: number
  setsCompleted: number
  /** kg is undefined for a set without weight, like pull-ups or a plank */
  onSetComplete: (kg?: number) => void
  /** Takes back the last set; hidden when not given */
  onUndo?: () => void
  disabled?: boolean
  saving?: boolean
}

export default function WeightLogger({
  targetKg,
  lastKg,
  previousKg,
  setsTotal,
  setsCompleted,
  onSetComplete,
  onUndo,
  disabled = false,
  saving = false,
}: WeightLoggerProps) {
  const [pesoInput, setPesoInput] = useState((lastKg ?? previousKg ?? targetKg)?.toString() ?? '')
  const [justCompleted, setJustCompleted] = useState(false)
  const touched = useRef(false)

  // Earlier weights load after the card: fill them in unless the student already typed
  useEffect(() => {
    if (!touched.current && lastKg == null && previousKg != null) setPesoInput(previousKg.toString())
  }, [lastKg, previousKg])

  const isDone = setsCompleted >= setsTotal
  const kg = pesoInput.trim() === '' ? undefined : Number(pesoInput.replace(',', '.'))
  const isValid = kg === undefined || (Number.isFinite(kg) && kg >= 0 && kg <= 999)

  const handleComplete = () => {
    if (!isValid || saving) return
    onSetComplete(kg === 0 ? undefined : kg)
    setJustCompleted(true)
    setTimeout(() => setJustCompleted(false), 600)
  }

  const undo = onUndo && setsCompleted > 0 && !disabled && (
    <button type="button" className="weight-logger__undo" onClick={onUndo} disabled={saving}>
      <Undo2 size={16} strokeWidth={2} />
      Deshacer serie {setsCompleted}
    </button>
  )

  if (isDone) {
    return (
      <div className="weight-logger__done-row">
        <p className="weight-logger__done">
          <Check size={18} strokeWidth={2.5} />
          Todas las series hechas{lastKg != null ? ` con ${formatKg(lastKg)} kg` : ''}
        </p>
        {undo}
      </div>
    )
  }

  const hints = [
    previousKg != null && `La última vez: ${formatKg(previousKg)} kg`,
    targetKg != null && `Objetivo: ${formatKg(targetKg)} kg`,
  ].filter(Boolean)

  return (
    <div className="weight-logger">
      <div className="weight-logger__sets">
        <div className="weight-logger__ticks" aria-label={`${setsCompleted} de ${setsTotal} series completadas`}>
          {Array.from({ length: setsTotal }).map((_, i) => (
            <span
              key={i}
              className={`weight-logger__tick${
                i < setsCompleted ? ' weight-logger__tick--done' : i === setsCompleted ? ' weight-logger__tick--now' : ''
              }`}
            />
          ))}
        </div>
        <span className="weight-logger__count">{setsCompleted}/{setsTotal}</span>
      </div>

      <div className="weight-logger__row">
        <div className="weight-logger__input-wrap">
          <input
            className={`weight-logger__input${isValid ? '' : ' weight-logger__input--invalid'}`}
            type="text"
            inputMode="decimal"
            placeholder="Sin peso"
            value={pesoInput}
            onChange={e => {
              touched.current = true
              setPesoInput(e.target.value)
            }}
            onFocus={e => e.target.select()}
            onKeyDown={e => {
              if (e.key === 'Enter') handleComplete()
            }}
            aria-label="Peso en kilogramos"
            aria-invalid={!isValid}
            disabled={disabled}
          />
          {pesoInput.trim() !== '' && <span className="weight-logger__unit">kg</span>}
        </div>

        <button
          className={`weight-logger__check${justCompleted ? ' weight-logger__check--flash' : ''}`}
          onClick={handleComplete}
          aria-label="Marcar serie como completada"
          disabled={disabled || saving || !isValid}
        >
          <Check size={26} strokeWidth={2.5} />
          <span>Serie {setsCompleted + 1}</span>
        </button>
      </div>

      {(!isValid || hints.length > 0 || undo) && (
        <div className="weight-logger__foot">
          {!isValid ? (
            <p className="weight-logger__hint weight-logger__hint--error" role="alert">
              Escribí el peso en kg, por ejemplo 42,5. Si no usás peso, dejalo vacío.
            </p>
          ) : (
            <p className="weight-logger__hint">{hints.join('. ')}</p>
          )}
          {undo}
        </div>
      )}
    </div>
  )
}
