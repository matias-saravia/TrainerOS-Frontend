import { useState } from 'react'
import { X, Search, Dumbbell, Check, Plus, Trash2, Calendar } from 'lucide-react'
import { useRoutines } from '../../workouts/hooks/useRoutines'
import { useAssignRoutine, useUnassignRoutine, useClientRoutines } from '../hooks/useClientRoutines'
import './AssignRoutineModal.css'

interface AssignRoutineModalProps {
  isOpen: boolean
  clientId: string
  clientName: string
  onClose: () => void
}

export default function AssignRoutineModal({
  isOpen,
  clientId,
  clientName,
  onClose,
}: AssignRoutineModalProps) {
  const [search, setSearch] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: allRoutines = [], isLoading: loadingRoutines } = useRoutines()
  const { data: assignedRoutines = [], isLoading: loadingAssigned } = useClientRoutines(clientId)
  const assignRoutine = useAssignRoutine()
  const unassignRoutine = useUnassignRoutine()

  const assignedIds = new Set(assignedRoutines.map(ar => ar.routine_id))

  const filtered = allRoutines.filter(r =>
    r.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (r.dia?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
    (r.descripcion?.toLowerCase().includes(search.toLowerCase()) ?? false)
  )

  const handleAssign = async (routineId: string) => {
    if (assignedIds.has(routineId)) return
    setActionError(null)
    try {
      await assignRoutine.mutateAsync({ clientId, routineId })
    } catch (err) {
      console.error('Error assigning routine:', err)
      setActionError('No pudimos asignar la rutina. Revisá tu conexión e intentá de nuevo.')
    }
  }

  const handleUnassign = async (routineId: string) => {
    setActionError(null)
    try {
      await unassignRoutine.mutateAsync({ clientId, routineId })
    } catch (err) {
      console.error('Error unassigning routine:', err)
      setActionError('No pudimos quitar la rutina. Revisá tu conexión e intentá de nuevo.')
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="assign-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="assign-modal">
        {/* Header */}
        <div className="assign-modal__header">
          <div className="assign-modal__header-text">
            <div className="assign-modal__title-row">
              <Dumbbell size={20} className="assign-modal__header-icon" />
              <h3 className="assign-modal__title">Gestionar Rutinas</h3>
            </div>
            <p className="assign-modal__subtitle">Alumno: <strong>{clientName}</strong></p>
          </div>
          <button
            type="button"
            className="assign-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body with scroll */}
        <div className="assign-modal__body">
          {actionError && <div className="alert" role="alert">{actionError}</div>}

          {/* ── Section 1: Currently Assigned Routines ── */}
          <section className="assign-modal__section">
            <div className="assign-modal__section-header">
              <h4 className="assign-modal__section-title">
                Rutinas Asignadas ({assignedRoutines.length})
              </h4>
            </div>

            {loadingAssigned ? (
              <div className="assign-modal__loading">Cargando rutinas asignadas...</div>
            ) : assignedRoutines.length === 0 ? (
              <div className="assign-modal__empty-assigned">
                <p>Este alumno no tiene ninguna rutina asignada todavía.</p>
                <span>Seleccioná una rutina de la lista de abajo para asignarla.</span>
              </div>
            ) : (
              <div className="assign-modal__assigned-list">
                {assignedRoutines.map(ar => {
                  const routine = ar.routines
                  if (!routine) return null
                  const isRemoving = unassignRoutine.isPending

                  return (
                    <div key={ar.id} className="assign-modal__assigned-item">
                      <div className="assign-modal__assigned-info">
                        <span className="assign-modal__assigned-name">{routine.nombre}</span>
                        {routine.dia && (
                          <span className="assign-modal__assigned-day">
                            <Calendar size={11} strokeWidth={1.5} />
                            {routine.dia}
                          </span>
                        )}
                        {routine.descripcion && (
                          <span className="assign-modal__assigned-desc">{routine.descripcion}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="assign-modal__remove-btn"
                        onClick={() => handleUnassign(routine.id)}
                        disabled={isRemoving}
                        title={`Desasignar ${routine.nombre}`}
                        aria-label={`Desasignar ${routine.nombre}`}
                      >
                        <Trash2 size={14} strokeWidth={1.75} />
                        <span>Quitar</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Section 2: Assign More Routines ── */}
          <section className="assign-modal__section">
            <div className="assign-modal__section-header">
              <h4 className="assign-modal__section-title">
                Rutinas disponibles
              </h4>
            </div>

            {/* Search input */}
            <div className="assign-modal__search-wrap">
              <Search size={15} className="assign-modal__search-icon" />
              <input
                type="text"
                className="assign-modal__search"
                placeholder="Buscar por nombre, día o descripción..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Routines available to assign */}
            <div className="assign-modal__list">
              {loadingRoutines ? (
                <div className="assign-modal__empty">Cargando rutinas del entrenador...</div>
              ) : filtered.length === 0 ? (
                <div className="assign-modal__empty">
                  <Dumbbell size={30} opacity={0.3} strokeWidth={1} />
                  <p>No se encontraron rutinas.</p>
                </div>
              ) : (
                filtered.map(routine => {
                  const isAssigned = assignedIds.has(routine.id)
                  const isPending = assignRoutine.isPending

                  return (
                    <div
                      key={routine.id}
                      className={`assign-modal__item${isAssigned ? ' assign-modal__item--assigned' : ''}`}
                    >
                      <div className="assign-modal__item-info">
                        <span className="assign-modal__item-name">{routine.nombre}</span>
                        {routine.dia && (
                          <span className="assign-modal__item-day">
                            <Calendar size={11} strokeWidth={1.5} />
                            {routine.dia}
                          </span>
                        )}
                        {routine.descripcion && (
                          <span className="assign-modal__item-desc">{routine.descripcion}</span>
                        )}
                      </div>

                      <div className="assign-modal__item-action">
                        {isAssigned ? (
                          <span className="assign-modal__badge-assigned">
                            <Check size={12} strokeWidth={2.5} />
                            Asignada
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="assign-modal__add-btn"
                            onClick={() => handleAssign(routine.id)}
                            disabled={isPending}
                            title={`Asignar ${routine.nombre}`}
                          >
                            <Plus size={14} strokeWidth={2} />
                            <span>Asignar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="assign-modal__footer">
          <button
            type="button"
            className="assign-modal__done-btn"
            onClick={onClose}
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}
