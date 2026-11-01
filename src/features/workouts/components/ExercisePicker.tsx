import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { MUSCLE_GROUPS, type MuscleGroup } from '../../exercises/api/exercises.api'
import { useExercises } from '../../exercises/hooks/useExercises'
import type { Tables } from '../../../lib/supabase'
import './ExercisePicker.css'

interface ExercisePickerProps {
  onAdd: (exercise: Tables<'exercises'>) => void
}

const FILTER_ALL = 'Todos'
type FilterValue = MuscleGroup | typeof FILTER_ALL

export default function ExercisePicker({ onAdd }: ExercisePickerProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterValue>(FILTER_ALL)

  const muscleQuery = filter === FILTER_ALL ? undefined : filter
  const { data: exercises = [] } = useExercises(muscleQuery)

  const filtered = useMemo(() => {
    if (search.trim() === '') return exercises
    const q = search.toLowerCase()
    return exercises.filter(ex =>
      ex.nombre.toLowerCase().includes(q) ||
      ex.grupo_muscular.toLowerCase().includes(q)
    )
  }, [exercises, search])

  const FILTERS: FilterValue[] = [FILTER_ALL, ...MUSCLE_GROUPS.slice(0, 5)]

  return (
    <aside className="exercise-picker" aria-label="Ejercicios">
      <h2 className="exercise-picker__title">Ejercicios</h2>

      {/* Search */}
      <div className="exercise-picker__search-wrap">
        <Search size={14} strokeWidth={1.5} className="exercise-picker__search-icon" />
        <input
          className="exercise-picker__search"
          type="text"
          placeholder="Buscar ejercicio…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Buscar ejercicio"
        />
      </div>

      {/* Filter chips */}
      <div className="exercise-picker__filters">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`ep-chip${filter === f ? ' ep-chip--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      <div className="exercise-picker__list" role="list">
        {filtered.map(ex => (
          <ExercisePickerItem key={ex.id} exercise={ex} onAdd={onAdd} />
        ))}
        {filtered.length === 0 && (
          <div className="exercise-picker__empty">
            Sin resultados para "{search}"
          </div>
        )}
      </div>
    </aside>
  )
}

/* ── Exercise Picker Item ── */
function ExercisePickerItem({
  exercise,
  onAdd,
}: {
  exercise: Tables<'exercises'>
  onAdd: (e: Tables<'exercises'>) => void
}) {
  return (
    <div
      className="ep-item"
      role="listitem"
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('application/json', JSON.stringify(exercise))
        e.dataTransfer.effectAllowed = 'copy'
      }}
    >
      {/* Drag handle */}
      <span className="ep-item__handle" aria-hidden="true">⠿</span>

      {/* Thumb */}
      {/* Info */}
      <div className="ep-item__info">
        <span className="ep-item__name">{exercise.nombre}</span>
        <span className="ep-item__meta">
          {exercise.grupo_muscular}
          {exercise.grupos_secundarios?.length
            ? `, ${exercise.grupos_secundarios.slice(0, 1).join(', ')}`
            : ''}
        </span>
      </div>

      {/* Add button */}
      <button
        className="ep-item__add-btn"
        onClick={() => onAdd(exercise)}
        aria-label={`Agregar ${exercise.nombre}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  )
}
