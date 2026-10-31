import { useState } from 'react'
import { Plus, X, Dumbbell } from 'lucide-react'
import type { Block, BlockExercise } from '../api/workouts.api'
import SetRepEditor from './SetRepEditor'
import './BlockCard.css'

interface BlockCardProps {
  block: Block
  onRemoveBlock: () => void
  onRemoveExercise: (exerciseId: string) => void
  onUpdateSetsReps: (exerciseId: string, sets: number, reps: string) => void
  onAddExercise?: () => void   // triggers picker in mobile
  dragHandleProps?: Record<string, unknown>
}

export default function BlockCard({
  block,
  onRemoveBlock,
  onRemoveExercise,
  onUpdateSetsReps,
  onAddExercise,
}: BlockCardProps) {
  const [editingExercise, setEditingExercise] = useState<BlockExercise | null>(null)
  const isSuperset = block.type === 'superset' || block.exercises.length > 1

  return (
    <>
      <div className={`block-card${isSuperset ? ' block-card--superset' : ''}`}>
        {/* Header */}
        <div className="block-card__header">
          <span className="block-card__handle" aria-hidden="true">≡</span>
          <span className="block-card__label">
            {isSuperset ? 'SUPERSERIE' : 'BLOQUE'} {block.label}
          </span>
          <div className="block-card__header-actions">
            {onAddExercise && (
              <button
                className="block-card__add-ex"
                onClick={onAddExercise}
                aria-label="Agregar ejercicio"
              >
                <Plus size={13} strokeWidth={2} />
                Ejercicio
              </button>
            )}
            <button
              className="block-card__remove"
              onClick={onRemoveBlock}
              aria-label="Eliminar bloque"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Exercise rows */}
        <div className="block-card__body">
          {block.exercises.map((be, idx) => (
            <ExerciseRow
              key={be.id}
              blockExercise={be}
              indexLabel={isSuperset ? `${block.label}${idx + 1}` : undefined}
              onEdit={() => setEditingExercise(be)}
              onRemove={() => onRemoveExercise(be.id)}
            />
          ))}
        </div>
      </div>

      {/* SetRep Editor Modal */}
      {editingExercise && (
        <SetRepEditor
          blockExercise={editingExercise}
          onSave={(sets, reps) => {
            onUpdateSetsReps(editingExercise.id, sets, reps)
          }}
          onClose={() => setEditingExercise(null)}
        />
      )}
    </>
  )
}

/* ── Exercise Row within a Block ── */
function ExerciseRow({
  blockExercise,
  indexLabel,
  onEdit,
  onRemove,
}: {
  blockExercise: BlockExercise
  indexLabel?: string
  onEdit: () => void
  onRemove: () => void
}) {
  const { exercise, sets, reps } = blockExercise

  return (
    <div className="block-ex-row">
      {/* Superset label */}
      {indexLabel && (
        <span className="block-ex-row__index">{indexLabel}</span>
      )}

      {/* Thumb */}
      <div className="block-ex-row__thumb" aria-hidden="true">
        <Dumbbell size={18} strokeWidth={1.5} />
      </div>

      {/* Info */}
      <div className="block-ex-row__info">
        <span className="block-ex-row__name">{exercise.nombre}</span>
        {blockExercise.tempo && (
          <span className="block-ex-row__detail">
            {exercise.grupo_muscular}
            {blockExercise.tempo ? `, tempo ${blockExercise.tempo}` : ''}
          </span>
        )}
        {!blockExercise.tempo && (
          <span className="block-ex-row__detail">{exercise.grupo_muscular}</span>
        )}
      </div>

      {/* Sets × Reps */}
      <div className="block-ex-row__metric">
        <span className="block-ex-row__sets">{sets}</span>
        <span className="block-ex-row__x">×</span>
        <span className="block-ex-row__reps">{reps}</span>
      </div>

      {/* Edit button */}
      <button
        className="block-ex-row__edit"
        onClick={onEdit}
        aria-label={`Editar ${exercise.nombre}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>

      {/* Remove exercise (visible on hover or mobile) */}
      <button
        className="block-ex-row__remove"
        onClick={onRemove}
        aria-label={`Quitar ${exercise.nombre}`}
      >
        <X size={12} strokeWidth={2} />
      </button>
    </div>
  )
}
