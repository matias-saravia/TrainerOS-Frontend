import { useState } from 'react'
import { Check } from 'lucide-react'
import './WeightLogger.css'

interface WeightLoggerProps {
  targetKg?: number
  lastKg?: number
  setsTotal: number
  setsCompleted: number
  onSetComplete: (kg: number) => void
  disabled?: boolean
}

export default function WeightLogger({
  targetKg,
  lastKg,
  setsTotal,
  setsCompleted,
  onSetComplete,
  disabled = false,
}: WeightLoggerProps) {
  const [pesoInput, setPesoInput] = useState((lastKg ?? targetKg)?.toString() ?? '')
  const [justCompleted, setJustCompleted] = useState(false)

  const isDone = setsCompleted >= setsTotal

  const handleComplete = () => {
    const kg = parseFloat(pesoInput)
    if (isNaN(kg) || kg <= 0) return
    onSetComplete(kg)
    setJustCompleted(true)
    setTimeout(() => setJustCompleted(false), 600)
  }

  if (isDone) {
    return (
      <p className="weight-logger__done">
        <Check size={18} strokeWidth={2.5} />
        Todas las series hechas{lastKg != null ? ` con ${lastKg} kg` : ''}
      </p>
    )
  }

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
            id={`peso-input-${setsCompleted}`}
            className="weight-logger__input"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={pesoInput}
            onChange={e => setPesoInput(e.target.value)}
            onFocus={e => e.target.select()}
            aria-label="Peso en kilogramos"
            disabled={disabled}
          />
          <span className="weight-logger__unit">kg</span>
        </div>

        <button
          className={`weight-logger__check${justCompleted ? ' weight-logger__check--flash' : ''}`}
          onClick={handleComplete}
          aria-label="Marcar serie como completada"
          disabled={disabled || !pesoInput || parseFloat(pesoInput) <= 0}
        >
          <Check size={26} strokeWidth={2.5} />
        </button>
      </div>

      {targetKg != null && <p className="weight-logger__target">Objetivo: {targetKg} kg</p>}
    </div>
  )
}
