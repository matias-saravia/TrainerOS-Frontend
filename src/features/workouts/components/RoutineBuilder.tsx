import type { Block } from '../api/workouts.api'
import type { Tables } from '../../../lib/supabase'
import BlockCard from './BlockCard'
import './RoutineBuilder.css'

interface RoutineBuilderProps {
  blocks: Block[]
  onDropExercise: (exercise: Tables<'exercises'>) => void
  onDropExerciseToBlock: (blockId: string, exercise: Tables<'exercises'>) => void
  onRemoveBlock: (blockId: string) => void
  onRemoveExercise: (blockId: string, exerciseId: string) => void
  onUpdateSetsReps: (blockId: string, exerciseId: string, sets: number, reps: string) => void
  onFinalize: () => void
  totalExercises: number
  estimatedMinutes: number
}

export default function RoutineBuilder({
  blocks,
  onDropExercise,
  onDropExerciseToBlock,
  onRemoveBlock,
  onRemoveExercise,
  onUpdateSetsReps,
  onFinalize,
  totalExercises,
  estimatedMinutes,
}: RoutineBuilderProps) {

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    try {
      const data = e.dataTransfer.getData('application/json')
      const exercise: Tables<'exercises'> = JSON.parse(data)
      onDropExercise(exercise)
    } catch {
      /* ignore */
    }
  }

  const handleDropToBlock = (e: React.DragEvent, blockId: string) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const data = e.dataTransfer.getData('application/json')
      const exercise: Tables<'exercises'> = JSON.parse(data)
      onDropExerciseToBlock(blockId, exercise)
    } catch {
      /* ignore */
    }
  }

  const isEmpty = blocks.length === 0

  return (
    <div className="routine-builder">
      {/* Topbar */}
      <div className="routine-builder__topbar">
        {totalExercises > 0 && (
          <span className="routine-builder__stats">
            {totalExercises} ejercicio{totalExercises !== 1 ? 's' : ''} · {estimatedMinutes} min est.
          </span>
        )}
        <button
          id="btn-finalizar-rutina"
          className="btn-primary routine-builder__finalize"
          onClick={onFinalize}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Guardar rutina
        </button>
      </div>

      {/* Canvas / Drop area */}
      <div
        className={`routine-builder__canvas${isEmpty ? ' routine-builder__canvas--empty' : ''}`}
        onDragOver={handleDragOver}
        onDrop={isEmpty ? handleDrop : undefined}
      >
        {isEmpty ? (
          /* Empty state drop zone */
          <div className="routine-builder__drop-hint">
            <div className="routine-builder__drop-hint-inner">
              <span className="routine-builder__drop-hint-text">
                Arrastrá un ejercicio acá o tocá + en la lista
              </span>
            </div>
          </div>
        ) : (
          /* Block list */
          <div className="routine-builder__blocks">
            {blocks.map((block) => (
              <div key={block.id} className="routine-builder__block-wrap">
                <BlockCard
                  block={block}
                  onRemoveBlock={() => onRemoveBlock(block.id)}
                  onRemoveExercise={(exId) => onRemoveExercise(block.id, exId)}
                  onUpdateSetsReps={(exId, sets, reps) =>
                    onUpdateSetsReps(block.id, exId, sets, reps)
                  }
                  onAddExercise={undefined}
                />
                {/* Per-block drop zone (add to superset) */}
                <div
                  className="routine-builder__block-drop"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropToBlock(e, block.id)}
                >
                  <span>Suelta aquí para agregar a este bloque</span>
                </div>
              </div>
            ))}

            {/* Final drop zone */}
            <div
              className="routine-builder__final-drop"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="routine-builder__final-drop-inner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                <span>SOLTAR EJERCICIO PARA AGREGAR AL FINAL</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
