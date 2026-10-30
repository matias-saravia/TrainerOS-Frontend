import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, X, AlertCircle } from 'lucide-react'
import { useRoutineBuilder } from '../../../features/workouts/hooks/useRoutineBuilder'
import { useRoutine, useSaveRoutine } from '../../../features/workouts/hooks/useRoutines'
import ExercisePicker from '../../../features/workouts/components/ExercisePicker'
import RoutineBuilder from '../../../features/workouts/components/RoutineBuilder'
import ErrorState from '../../../components/ErrorState'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import { makeId } from '../../../features/workouts/api/workouts.api'
import type { Tables } from '../../../lib/supabase'
import './ArmarRutinaPage.css'

export default function ArmarRutinaPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [routineTitle, setRoutineTitle] = useState('Nueva Rutina')
  const [isPickerOpen, setIsPickerOpen] = useState(false) // mobile drawer state
  const [pickerTargetBlockId, setPickerTargetBlockId] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const saveRoutine = useSaveRoutine()
  const { data: existingRoutine, isLoading: loadingRoutine, error: routineError, refetch } = useRoutine(id ?? '')

  const {
    blocks,
    addBlock,
    addExerciseToBlock,
    loadBlocks,
    removeBlock,
    removeExerciseFromBlock,
    updateSetsReps,
    totalExercises,
    estimatedMinutes,
  } = useRoutineBuilder(routineTitle)

  // Pre-fill the canvas when editing an existing routine
  useEffect(() => {
    if (!existingRoutine) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoutineTitle(existingRoutine.nombre)
    loadBlocks(
      existingRoutine.blocks.map(block => ({
        id: makeId(),
        label: block.label,
        type: block.type,
        exercises: block.routine_block_exercises.flatMap(rbe =>
          rbe.exercises
            ? [{
                id: makeId(),
                exercise: rbe.exercises,
                sets: rbe.sets,
                reps: rbe.reps,
                tempo: rbe.tempo ?? '',
                restSeconds: rbe.rest_seconds ?? undefined,
                notes: rbe.notes ?? '',
              }]
            : []
        ),
      }))
    )
  }, [existingRoutine, loadBlocks])

  const handleAddFromPicker = (exercise: Tables<'exercises'>) => {
    setValidationError(null)
    if (pickerTargetBlockId) {
      addExerciseToBlock(pickerTargetBlockId, exercise)
    } else {
      addBlock(exercise)
    }
    setIsPickerOpen(false)
    setPickerTargetBlockId(null)
  }

  const handleDropExercise = (exercise: Tables<'exercises'>) => {
    setValidationError(null)
    addBlock(exercise)
  }

  const handleDropToBlock = (blockId: string, exercise: Tables<'exercises'>) => {
    setValidationError(null)
    addExerciseToBlock(blockId, exercise)
  }

  const handleFinalize = async () => {
    setValidationError(null)

    if (!routineTitle.trim()) {
      setValidationError('La rutina debe tener un nombre.')
      return
    }

    if (totalExercises === 0) {
      setValidationError('Debes añadir al menos un ejercicio a la rutina.')
      return
    }

    try {
      await saveRoutine.mutateAsync({
        id,
        nombre: routineTitle.trim(),
        descripcion: `${totalExercises} ejercicios · ${estimatedMinutes} min est.`,
        blocks: blocks.map(b => ({
          label: b.label,
          type: b.type,
          exercises: b.exercises.map(e => ({
            exercise_id: e.exercise.id,
            sets: e.sets,
            reps: e.reps,
            tempo: e.tempo,
            rest_seconds: e.restSeconds,
            notes: e.notes,
          })),
        })),
      })
      navigate('/admin/entrenamientos')
    } catch (err: unknown) {
      console.error('Error saving routine:', err)
      const message = (err as { message?: string })?.message
      setValidationError(message || 'Error al guardar la rutina en la base de datos.')
    }
  }

  if (id && loadingRoutine) {
    return (
      <div className="armar-rutina-page" style={{ padding: '24px' }}>
        <LoadingSkeleton count={3} variant="card" />
      </div>
    )
  }

  if (id && routineError) {
    return (
      <div className="armar-rutina-page" style={{ padding: '24px' }}>
        <ErrorState message="No pudimos cargar esta rutina." onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="armar-rutina-page">

      {/* ── Desktop/Mobile Header ── */}
      <header className="armar-rutina__header">
        <div className="armar-rutina__header-left">
          <button
            className="armar-rutina__back"
            onClick={() => navigate(-1)}
            aria-label="Volver"
          >
            <ArrowLeft size={18} strokeWidth={1.5} />
          </button>
          <div className="armar-rutina__title-wrap">
            <span className="armar-rutina__title-prefix">{id ? 'Editar Rutina:' : 'Armar Rutina:'}</span>
            <input
              className="armar-rutina__title-input"
              value={routineTitle}
              onChange={e => {
                setRoutineTitle(e.target.value)
                setValidationError(null)
              }}
              aria-label="Nombre de la rutina"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Mobile-only: Finalizar en header */}
        <button
          className="armar-rutina__finalize-mobile btn-primary"
          onClick={handleFinalize}
          disabled={saveRoutine.isPending}
        >
          {saveRoutine.isPending ? 'Guardando...' : 'Finalizar'}
        </button>
      </header>

      {/* Validation banner */}
      {validationError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#fef2f2',
          borderBottom: '1px solid #fecaca',
          color: '#991b1b',
          padding: '10px 24px',
          fontSize: '13px',
          fontWeight: 500,
        }}>
          <AlertCircle size={16} />
          <span>{validationError}</span>
        </div>
      )}

      {/* ── Desktop Layout: split panel ── */}
      <div className="armar-rutina__body">

        {/* Left panel: Exercise Picker */}
        <div className="armar-rutina__picker-panel">
          <ExercisePicker onAdd={handleAddFromPicker} />
        </div>

        {/* Right panel: Routine Builder canvas */}
        <div className="armar-rutina__builder-panel">
          <RoutineBuilder
            blocks={blocks}
            onDropExercise={handleDropExercise}
            onDropExerciseToBlock={handleDropToBlock}
            onRemoveBlock={removeBlock}
            onRemoveExercise={removeExerciseFromBlock}
            onUpdateSetsReps={updateSetsReps}
            onFinalize={handleFinalize}
            totalExercises={totalExercises}
            estimatedMinutes={estimatedMinutes}
          />
        </div>
      </div>

      {/* ── Mobile: Routine list view ── */}
      <div className="armar-rutina__mobile-body">
        {/* Routine info */}
        <div className="armar-rutina__mobile-meta">
          <span className="armar-rutina__mobile-stats">
            {totalExercises} Ejercicio{totalExercises !== 1 ? 's' : ''} · {estimatedMinutes} min est.
          </span>
        </div>

        {/* Builder blocks */}
        <RoutineBuilder
          blocks={blocks}
          onDropExercise={handleDropExercise}
          onDropExerciseToBlock={handleDropToBlock}
          onRemoveBlock={removeBlock}
          onRemoveExercise={removeExerciseFromBlock}
          onUpdateSetsReps={updateSetsReps}
          onFinalize={handleFinalize}
          totalExercises={totalExercises}
          estimatedMinutes={estimatedMinutes}
        />

        {/* Add Exercise button (mobile) */}
        <div className="armar-rutina__mobile-add">
          <button
            className="armar-rutina__mobile-add-btn"
            onClick={() => {
              setPickerTargetBlockId(null)
              setIsPickerOpen(true)
            }}
          >
            <Plus size={18} strokeWidth={2} />
            Agregar Ejercicio
          </button>
        </div>

        {/* Mobile FAB */}
        <button
          id="fab-armar-rutina"
          className="armar-rutina__fab"
          onClick={() => {
            setPickerTargetBlockId(null)
            setIsPickerOpen(true)
          }}
          aria-label="Agregar ejercicio"
        >
          <Plus size={24} strokeWidth={2} />
        </button>
      </div>

      {/* ── Mobile: Exercise Picker Bottom Sheet ── */}
      {isPickerOpen && (
        <div className="armar-rutina__sheet-overlay" onClick={() => setIsPickerOpen(false)}>
          <div
            className="armar-rutina__sheet"
            onClick={e => e.stopPropagation()}
          >
            <div className="armar-rutina__sheet-header">
              <span className="armar-rutina__sheet-title">Banco de Ejercicios</span>
              <button
                className="armar-rutina__sheet-close"
                onClick={() => setIsPickerOpen(false)}
                aria-label="Cerrar"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <div className="armar-rutina__sheet-body">
              <ExercisePicker onAdd={handleAddFromPicker} />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
