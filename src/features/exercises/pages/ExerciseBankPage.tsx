import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
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

  if (error) {
    return (
      <div className="exercise-bank">
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="exercise-bank">
      <header className="page-header">
        <h1 className="page-header__title">Ejercicios</h1>
        <button
          id="btn-nuevo-ejercicio"
          className="btn-primary"
          onClick={() => navigate('/admin/entrenamientos/ejercicios/nuevo')}
        >
          <Plus size={16} strokeWidth={1.75} />
          Nuevo ejercicio
        </button>
      </header>

      <section className="sheet exercise-bank__sheet">
        <div className="exercise-bank__toolbar">
          <div className="exercise-bank__search-wrap">
            <Search size={16} strokeWidth={1.5} className="exercise-bank__search-icon" />
            <input
              id="exercise-search"
              className="exercise-bank__search"
              type="search"
              placeholder="Buscar ejercicio"
              aria-label="Buscar ejercicio"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="tab-row" role="tablist" aria-label="Filtrar por grupo muscular">
            {(['Todos', ...MUSCLE_GROUPS] as const).map(g => (
              <button
                key={g}
                role="tab"
                aria-selected={activeFilter === g}
                className={`tab-btn${activeFilter === g ? ' tab-btn--active' : ''}`}
                onClick={() => setActiveFilter(g as MuscleGroup | 'Todos')}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <LoadingSkeleton count={6} variant="list" />
        ) : filtered.length === 0 ? (
          <div className="exercise-bank__empty">
            <p>No encontramos ejercicios con esa búsqueda.</p>
            <button
              className="btn-primary"
              onClick={() => navigate('/admin/entrenamientos/ejercicios/nuevo')}
            >
              <Plus size={16} strokeWidth={1.75} />
              Nuevo ejercicio
            </button>
          </div>
        ) : (
          <table className="hoja">
            <thead>
              <tr>
                <th>Ejercicio</th>
                <th>Grupo muscular</th>
                <th className="exercise-row__level">Dificultad</th>
                <th className="exercise-row__howto">Instrucción</th>
                <th className="hoja__end" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(ex => (
                <ExerciseCard key={ex.id} exercise={ex} onEdit={ex.trainer_id ? handleEdit : undefined} />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
