import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Users, Pencil, Trash2, AlertCircle, Link2, Dumbbell, Eye } from 'lucide-react'
import { useClients, useDeleteClient, type ClientRow } from '../hooks/useClients'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import ErrorState from '../../../components/ErrorState'
import EmptyState from '../../../components/EmptyState'
import ConfirmModal from '../../../components/ConfirmModal'
import AssignRoutineModal from '../components/AssignRoutineModal'
import { useAuth } from '../../auth'
import { getTrainerLink } from '../../../utils/trainerLink'
import { CLIENT_STATUS, PLAN_LABELS } from '../clientStatus'
import './ClientesPage.css'

type Tab = 'todos' | 'activos' | 'pendientes' | 'vencer'

const tabs: { key: Tab; label: string }[] = [
  { key: 'todos',      label: 'Todos' },
  { key: 'activos',    label: 'Al día' },
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'vencer',     label: 'Por vencer' },
]

export default function ClientesPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('todos')
  const [clientToDelete, setClientToDelete] = useState<ClientRow | null>(null)
  const [clientForRoutines, setClientForRoutines] = useState<ClientRow | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: clients = [], isLoading, error, refetch } = useClients(activeTab)
  const deleteClient = useDeleteClient()
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null)

  const handleCopyClientLink = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(getTrainerLink(profile?.slug)).then(() => {
      setCopiedClientId(clientId)
      setTimeout(() => setCopiedClientId(null), 2000)
    })
  }

  const handleDeleteClient = async () => {
    if (!clientToDelete) return
    setActionError(null)
    try {
      await deleteClient.mutateAsync(clientToDelete.id)
      setClientToDelete(null)
    } catch (err: unknown) {
      console.error('Error al eliminar cliente:', err)
      const msg = err instanceof Error ? err.message : 'No pudimos eliminar al alumno.'
      setActionError(msg)
    }
  }

  if (error) {
    return (
      <div className="clientes-page">
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="clientes-page">
      <header className="page-header">
        <h1 className="page-header__title">Alumnos</h1>
        <button className="btn-primary" onClick={() => navigate('/admin/clientes/nuevo')}>
          <UserPlus size={16} strokeWidth={1.75} />
          Nuevo alumno
        </button>
      </header>

      {actionError && (
        <div className="alert clientes-page__alert" role="alert">
          <AlertCircle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      <section className="sheet">
        <div className="sheet__head">
          <div className="tab-row" role="tablist" aria-label="Filtrar alumnos">
            {tabs.map(t => (
              <button
                key={t.key}
                role="tab"
                aria-selected={activeTab === t.key}
                className={`tab-btn${activeTab === t.key ? ' tab-btn--active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <LoadingSkeleton count={4} variant="list" />
        ) : clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sin alumnos"
            description={activeTab === 'todos'
              ? 'Cargá tu primer alumno y pasale tu link para que empiece a entrenar.'
              : 'Ningún alumno coincide con este filtro.'}
            action={activeTab === 'todos' ? {
              label: 'Nuevo alumno',
              onClick: () => navigate('/admin/clientes/nuevo'),
            } : undefined}
          />
        ) : (
          <table className="hoja clientes-table">
            <thead>
              <tr>
                <th>Semana</th>
                <th>Alumno</th>
                <th>Objetivo</th>
                <th>Estado</th>
                <th className="hoja__end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => {
                const status = CLIENT_STATUS[client.status]
                return (
                  <tr
                    key={client.id}
                    data-clickable
                    className={client.status === 'pendiente' ? 'marker' : undefined}
                    onClick={() => navigate(`/admin/clientes/${client.id}/editar`)}
                  >
                    <td className="hoja__lead">{client.semana_actual}<small>/{client.total_semanas}</small></td>
                    <td className="hoja__name">{client.nombre} {client.apellido}</td>
                    <td className="clientes-table__goal">{client.objetivo ?? PLAN_LABELS[client.plan_tier]}</td>
                    <td className="clientes-table__status">
                      <span className={`status ${status?.tone ?? ''}`}>{status?.label ?? client.status}</span>
                    </td>
                    <td className="hoja__end clientes-table__tools" onClick={e => e.stopPropagation()}>
                      <div className="clientes-table__actions">
                        <button
                          className="icon-action-btn"
                          title="Editar alumno"
                          aria-label={`Editar a ${client.nombre}`}
                          onClick={() => navigate(`/admin/clientes/${client.id}/editar`)}
                        >
                          <Pencil size={16} strokeWidth={1.5} />
                        </button>
                        <button
                          className={`icon-action-btn${copiedClientId === client.id ? ' icon-action-btn--copied' : ''}`}
                          title={copiedClientId === client.id ? 'Copiado' : 'Copiar link del alumno'}
                          aria-label="Copiar link del alumno"
                          onClick={e => handleCopyClientLink(client.id, e)}
                        >
                          <Link2 size={16} strokeWidth={1.5} />
                        </button>
                        <button
                          className="icon-action-btn"
                          title="Ver como alumno"
                          aria-label={`Ver como alumno a ${client.nombre}`}
                          onClick={() => navigate(`/vista-alumno/${client.id}`)}
                        >
                          <Eye size={16} strokeWidth={1.5} />
                        </button>
                        <button
                          className="clientes-table__routines"
                          aria-label={`Gestionar rutinas de ${client.nombre}`}
                          onClick={() => setClientForRoutines(client)}
                        >
                          <Dumbbell size={15} strokeWidth={1.5} />
                          Rutinas
                        </button>
                        <button
                          className="icon-action-btn icon-action-btn--danger"
                          title="Eliminar alumno"
                          aria-label={`Eliminar a ${client.nombre}`}
                          onClick={() => setClientToDelete(client)}
                        >
                          <Trash2 size={16} strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <ConfirmModal
        isOpen={Boolean(clientToDelete)}
        title="Eliminar alumno"
        variant="danger"
        confirmText="Eliminar alumno"
        cancelText="Cancelar"
        isLoading={deleteClient.isPending}
        onConfirm={handleDeleteClient}
        onClose={() => setClientToDelete(null)}
        description={
          clientToDelete ? (
            <p>
              ¿Querés eliminar a{' '}
              <strong>{clientToDelete.nombre} {clientToDelete.apellido}</strong>?
              No se puede deshacer y se borra toda su información.
            </p>
          ) : null
        }
      />

      <AssignRoutineModal
        isOpen={Boolean(clientForRoutines)}
        clientId={clientForRoutines?.id ?? ''}
        clientName={clientForRoutines ? `${clientForRoutines.nombre} ${clientForRoutines.apellido}` : ''}
        onClose={() => setClientForRoutines(null)}
      />
    </div>
  )
}
