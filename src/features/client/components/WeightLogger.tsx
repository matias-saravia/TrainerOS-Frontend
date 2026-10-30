import { useState } from 'react'
import './WeightLogger.css'

interface WeightLoggerProps {
  targetKg?: number
  lastKg?: number
  setsTotal: number
  setsCompleted: number
  onSetComplete: (kg: number) => void
}

export default function WeightLogger({
  targetKg,
  lastKg,
  setsTotal,
  setsCompleted,
  onSetComplete,
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
      <div className="weight-logger">
        <div className="weight-logger__done-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>Todas las series completadas{lastKg != null ? ` con ${lastKg}kg` : ''}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="weight-logger">
      {/* Sets progress dots */}
      <div className="weight-logger__sets-row">
        <span className="weight-logger__sets-label">Series</span>
        <div className="weight-logger__dots" aria-label={`${setsCompleted} de ${setsTotal} series completadas`}>
          {Array.from({ length: setsTotal }).map((_, i) => (
            <span
              key={i}
              className={`weight-logger__dot${i < setsCompleted ? ' weight-logger__dot--done' : ''}`}
            />
          ))}
        </div>
        <span className="weight-logger__sets-count">{setsCompleted}/{setsTotal}</span>
      </div>

      {/* Objetivo label */}
      {targetKg && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span className="weight-logger__objective">Objetivo: {targetKg}kg</span>
        </div>
      )}

      {/* Input + check row — matches mockup */}
      <div className="weight-logger__input-row">
        <div className="weight-logger__input-wrap">
          <input
            id={`peso-input-${setsCompleted}`}
            className="weight-logger__input"
            type="number"
            inputMode="decimal"
            placeholder="Peso"
            value={pesoInput}
            onChange={e => setPesoInput(e.target.value)}
            onFocus={e => e.target.select()}
            aria-label="Peso en kilogramos"
          />
          <span className="weight-logger__unit">kg</span>
        </div>

        <button
          className={`weight-logger__check-btn${justCompleted ? ' weight-logger__check-btn--flash' : ''}`}
          onClick={handleComplete}
          aria-label="Marcar serie como completada"
          disabled={!pesoInput || parseFloat(pesoInput) <= 0}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
