import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, UserCircle, Pencil, Trash2, AlertCircle, Link2, Dumbbell } from 'lucide-react'
import { useClients, useDeleteClient, type ClientRow } from '../hooks/useClients'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import ErrorState from '../../../components/ErrorState'
import EmptyState from '../../../components/EmptyState'
import ConfirmModal from '../../../components/ConfirmModal'
import AssignRoutineModal from '../components/AssignRoutineModal'
import { useAuth } from '../../auth'
import { getTrainerLink } from '../../../utils/trainerLink'
import './ClientesPage.css'

type Tab = 'todos' | 'activos' | 'pendientes' | 'vencer'

const statusColor: Record<string, string> = {
  aldia:    '#22c55e',
  vence:    '#f59e0b',
  pendiente:'#ba1a1a',
}

const statusLabels: Record<string, string> = {
  aldia:     'Al día',
  vence:     'Vence pronto',
  pendiente: 'Pendiente',
}

const tabs: { key: Tab; label: string }[] = [
  { key: 'todos',      label: 'Todos' },
  { key: 'activos',    label: 'Activos' },
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'vencer',     label: 'Próximos a Vencer' },
]

function getInitials(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
}

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
      const msg = err instanceof Error ? err.message : 'Error al eliminar el cliente.'
      setActionError(msg)
    }
  }

  if (isLoading) {
    return (
      <div className="clientes-page">
        <div className="page-header">
          <h1 className="page-header__title">Gestión de Clientes</h1>
        </div>
        <LoadingSkeleton count={4} variant="list" />
      </div>
    )
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
      {/* Page header */}
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Clientes</h1>
        <button
          className="btn-primary"
          onClick={() => navigate('/admin/clientes/nuevo')}
        >
          <UserPlus size={16} strokeWidth={1.5} />
          Nuevo Cliente
        </button>
      </div>

      {/* Action feedback error if any */}
      {actionError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '8px',
          margin: '16px 24px 0 24px',
          fontSize: '13.5px',
          fontWeight: 500,
        }}>
          <AlertCircle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="clientes-page__tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`tab-btn${activeTab === t.key ? ' tab-btn--active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Client grid */}
      {clients.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title="Sin clientes"
          description="Aún no tenés clientes registrados. Creá el primero para empezar."
          action={{
            label: 'Nuevo Cliente',
            onClick: () => navigate('/admin/clientes/nuevo'),
          }}
        />
      ) : (
        <div className="clientes-grid">
          {clients.map(client => (
            <div
              key={client.id}
              className="client-card"
              onClick={() => navigate(`/admin/clientes/${client.id}/editar`)}
            >
              <div className="client-card__header">
                <div className="client-card__avatar">
                  <UserCircle size={28} strokeWidth={1.5} />
                  <span className="client-card__initials">
                    {getInitials(client.nombre, client.apellido)}
                  </span>
                </div>
                <div className="client-card__info">
                  <p className="client-card__name">
                    {client.nombre} {client.apellido}
                  </p>
                  <p className="client-card__goal">{client.objetivo ?? client.plan_tier}</p>
                </div>
              </div>

              <div className="client-card__status-row">
                <div className="client-card__status">
                  <span
                    className="status-dot"
                    style={{ background: statusColor[client.status] ?? '#94a3b8' }}
                  />
                  <span className="status-label">
                    {statusLabels[client.status] ?? client.status}
                  </span>
                </div>
                <span className="client-card__last-session">
                  Semana {client.semana_actual}/{client.total_semanas}
                </span>
              </div>

              <div className="client-card__actions" onClick={e => e.stopPropagation()}>
                <div className="client-card__actions-left">
                  <button
                    className="icon-action-btn"
                    title="Editar cliente"
                    onClick={() => navigate(`/admin/clientes/${client.id}/editar`)}
                  >
                    <Pencil size={15} strokeWidth={1.5} />
                  </button>
                  <button
                    className="icon-action-btn icon-action-btn--danger"
                    title="Eliminar cliente"
                    onClick={() => setClientToDelete(client)}
                  >
                    <Trash2 size={15} strokeWidth={1.5} />
                  </button>
                  <button
                    className={`icon-action-btn${copiedClientId === client.id ? ' icon-action-btn--copied' : ''}`}
                    title={copiedClientId === client.id ? '¡Copiado!' : 'Copiar link del alumno'}
                    onClick={e => handleCopyClientLink(client.id, e)}
                    aria-label="Copiar link del alumno"
                  >
                    <Link2 size={15} strokeWidth={1.5} />
                  </button>
                </div>

                <button
                  className="client-card__routines-btn"
                  title="Gestionar y asignar rutinas"
                  onClick={e => {
                    e.stopPropagation()
                    setClientForRoutines(client)
                  }}
                  aria-label="Gestionar rutinas"
                >
                  <Dumbbell size={13} strokeWidth={2} />
                  <span>Rutinas</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmación para eliminar cliente */}
      <ConfirmModal
        isOpen={Boolean(clientToDelete)}
        title="Eliminar Cliente"
        variant="danger"
        confirmText="Eliminar Cliente"
        cancelText="Cancelar"
        isLoading={deleteClient.isPending}
        onConfirm={handleDeleteClient}
        onClose={() => setClientToDelete(null)}
        description={
          clientToDelete ? (
            <p>
              ¿Estás seguro de que deseas eliminar permanentemente a{' '}
              <strong>{clientToDelete.nombre} {clientToDelete.apellido}</strong>?
              Esta acción no se puede deshacer y borrará su información asociada.
            </p>
          ) : null
        }
      />

      {/* Modal para agregar y gestionar rutinas directamente */}
      <AssignRoutineModal
        isOpen={Boolean(clientForRoutines)}
        clientId={clientForRoutines?.id ?? ''}
        clientName={clientForRoutines ? `${clientForRoutines.nombre} ${clientForRoutines.apellido}` : ''}
        onClose={() => setClientForRoutines(null)}
      />
    </div>
  )
}
