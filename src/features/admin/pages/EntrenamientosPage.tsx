import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Dumbbell, Plus, Trash2, Pencil } from 'lucide-react'
import { useRoutines, useDeleteRoutine, useDuplicateRoutine, type RoutineRow } from '../../workouts/hooks/useRoutines'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import ErrorState from '../../../components/ErrorState'
import EmptyState from '../../../components/EmptyState'
import ConfirmModal from '../../../components/ConfirmModal'
import './EntrenamientosPage.css'

export default function EntrenamientosPage() {
  const navigate = useNavigate()
  return (
    <div className="entrenamientos-page">
      <header className="page-header">
        <h1 className="page-header__title">Rutinas</h1>
        <button
          id="btn-nueva-rutina"
          className="btn-primary"
          onClick={() => navigate('/admin/entrenamientos/rutinas/nueva')}
        >
          <Plus size={16} strokeWidth={1.75} />
          Nueva rutina
        </button>
      </header>
      <RutinasList />
    </div>
  )
}

function RutinasList() {
  const navigate = useNavigate()
  const { data: routines = [], isLoading, error, refetch } = useRoutines()
  const deleteRoutine = useDeleteRoutine()
  const duplicateRoutine = useDuplicateRoutine()
  const [routineToDelete, setRoutineToDelete] = useState<RoutineRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDeleteRoutine = async () => {
    if (!routineToDelete) return
    try {
      await deleteRoutine.mutateAsync(routineToDelete.id)
      setRoutineToDelete(null)
    } catch (err) {
      console.error('Error al eliminar rutina:', err)
      setRoutineToDelete(null)
      setDeleteError('No pudimos eliminar la rutina. Revisá tu conexión e intentá de nuevo.')
    }
  }

  // The copy opens right away: duplicating is almost always to change something
  const handleDuplicate = async (routine: RoutineRow) => {
    setDeleteError(null)
    try {
      const newId = await duplicateRoutine.mutateAsync(routine.id)
      navigate(`/admin/entrenamientos/rutinas/${newId}/editar`)
    } catch (err) {
      console.error('Error al duplicar rutina:', err)
      setDeleteError(`No pudimos duplicar ${routine.nombre}. Revisá tu conexión e intentá de nuevo.`)
    }
  }

  if (isLoading) return <LoadingSkeleton count={3} variant="list" />
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />

  return (
    <section className="sheet entrenamientos-page__sheet">
      {deleteError && <div className="alert" role="alert">{deleteError}</div>}
      {routines.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Sin rutinas"
          description="Armá tu primera rutina con bloques y ejercicios, y después asignala a tus alumnos."
          action={{ label: 'Nueva rutina', onClick: () => navigate('/admin/entrenamientos/rutinas/nueva') }}
        />
      ) : (
        <table className="hoja rutinas-table">
          <thead>
            <tr>
              <th>Rutina</th>
              <th>Día</th>
              <th>Descripción</th>
              <th className="hoja__end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {routines.map(r => (
              <tr key={r.id} data-clickable onClick={() => navigate(`/admin/entrenamientos/rutinas/${r.id}/editar`)}>
                <td className="hoja__name">{r.nombre}</td>
                <td className="rutinas-table__day">{r.dia}</td>
                <td className="rutinas-table__desc">{r.descripcion}</td>
                <td className="hoja__end" onClick={e => e.stopPropagation()}>
                  <button
                    className="icon-action-btn"
                    title={`Editar ${r.nombre}`}
                    aria-label={`Editar ${r.nombre}`}
                    onClick={() => navigate(`/admin/entrenamientos/rutinas/${r.id}/editar`)}
                  >
                    <Pencil size={16} strokeWidth={1.5} />
                  </button>
                  <button
                    className="icon-action-btn"
                    title={`Duplicar ${r.nombre}`}
                    aria-label={`Duplicar ${r.nombre}`}
                    onClick={() => handleDuplicate(r)}
                    disabled={duplicateRoutine.isPending}
                  >
                    <Copy size={16} strokeWidth={1.5} />
                  </button>
                  <button
                    className="icon-action-btn icon-action-btn--danger"
                    title={`Eliminar ${r.nombre}`}
                    aria-label={`Eliminar ${r.nombre}`}
                    onClick={() => setRoutineToDelete(r)}
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ConfirmModal
        isOpen={Boolean(routineToDelete)}
        title="Eliminar rutina"
        variant="danger"
        confirmText="Eliminar rutina"
        cancelText="Cancelar"
        isLoading={deleteRoutine.isPending}
        onConfirm={handleDeleteRoutine}
        onClose={() => setRoutineToDelete(null)}
        description={
          routineToDelete ? (
            <p>
              ¿Querés eliminar <strong>{routineToDelete.nombre}</strong>? No se puede deshacer y se borran sus bloques y ejercicios.
            </p>
          ) : null
        }
      />
    </section>
  )
}
