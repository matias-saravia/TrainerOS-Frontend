import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Dumbbell } from 'lucide-react'
import { MUSCLE_GROUPS, type MuscleGroup } from '../api/exercises.api'
import { useExercises } from '../hooks/useExercises'
import type { Tables } from '../../../lib/supabase'
import ExerciseCard from '../components/ExerciseCard'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import ErrorState from '../../../components/ErrorState'
import './ExerciseBankPage.css'

export default function ExerciseBankPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<MuscleGroup | 'Todos'>('Todos')

  const muscleQuery = activeFilter === 'Todos' ? undefined : activeFilter
  const { data: exercises = [], isLoading, error, refetch } = useExercises(muscleQuery)

  const filtered = useMemo(() => {
    if (search.trim() === '') return exercises
    const q = search.toLowerCase()
    return exercises.filter(ex =>
      ex.nombre.toLowerCase().includes(q) ||
      ex.grupo_muscular.toLowerCase().includes(q)
    )
  }, [exercises, search])

  const handleEdit = (ex: Tables<'exercises'>) => {
    navigate(`/admin/entrenamientos/ejercicios/${ex.id}/editar`)
  }

  if (isLoading) {
    return (
      <div className="exercise-bank">
        <div className="exercise-bank__header">
          <div className="exercise-bank__header-left">
            <div className="exercise-bank__title-row">
              <Dumbbell size={22} strokeWidth={1.5} className="exercise-bank__title-icon" />
              <h1 className="exercise-bank__title">Banco de Ejercicios</h1>
            </div>
          </div>
        </div>
        <LoadingSkeleton count={6} variant="card" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="exercise-bank">
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="exercise-bank">
      {/* ── Header ── */}
      <div className="exercise-bank__header">
        <div className="exercise-bank__header-left">
          <div className="exercise-bank__title-row">
            <Dumbbell size={22} strokeWidth={1.5} className="exercise-bank__title-icon" />
            <h1 className="exercise-bank__title">Banco de Ejercicios</h1>
          </div>
          <p className="exercise-bank__subtitle">
            {exercises.length} ejercicios en tu biblioteca
          </p>
        </div>
        <button
          id="btn-nuevo-ejercicio"
          className="btn-primary exercise-bank__cta"
          onClick={() => navigate('/admin/entrenamientos/ejercicios/nuevo')}
        >
          <Plus size={16} strokeWidth={2} />
          Nuevo Ejercicio
        </button>
      </div>

      {/* ── Search + Filters ── */}
      <div className="exercise-bank__toolbar">
        <div className="exercise-bank__search-wrap">
          <Search size={15} strokeWidth={1.5} className="exercise-bank__search-icon" />
          <input
            id="exercise-search"
            className="exercise-bank__search"
            type="text"
            placeholder="Buscar ejercicio…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="exercise-bank__filters">
          {(['Todos', ...MUSCLE_GROUPS] as const).map(g => (
            <button
              key={g}
              className={`filter-chip${activeFilter === g ? ' filter-chip--active' : ''}`}
              onClick={() => setActiveFilter(g as MuscleGroup | 'Todos')}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* ── Exercise Grid ── */}
      {filtered.length === 0 ? (
        <div className="exercise-bank__empty">
          <Dumbbell size={40} strokeWidth={1} opacity={0.3} />
          <p>No se encontraron ejercicios</p>
          <button
            className="btn-primary"
            onClick={() => navigate('/admin/entrenamientos/ejercicios/nuevo')}
          >
            <Plus size={14} strokeWidth={2} />
            Crear el primero
          </button>
        </div>
      ) : (
        <div className="exercise-bank__grid">
          {filtered.map(ex => (
            <ExerciseCard key={ex.id} exercise={ex} onEdit={ex.trainer_id ? handleEdit : undefined} />
          ))}
        </div>
      )}

      {/* ── Mobile FAB ── */}
      <button
        id="fab-nuevo-ejercicio"
        className="exercise-bank__fab"
        onClick={() => navigate('/admin/entrenamientos/ejercicios/nuevo')}
        aria-label="Nuevo Ejercicio"
      >
        <Plus size={24} strokeWidth={2} />
      </button>
    </div>
  )
}
