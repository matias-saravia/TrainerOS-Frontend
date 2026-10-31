import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useClients } from '../hooks/useClients'
import ErrorState from '../../../components/ErrorState'

export default function VistaAlumnoPage() {
  const { data: clients = [], isLoading, error, refetch } = useClients()

  if (error) {
    return (
      <div className="vista-alumno">
        <ErrorState message="No pudimos cargar tus alumnos." onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="vista-alumno">
      <h1>Ver como alumno</h1>
      {isLoading ? (
        <p>Cargando...</p>
      ) : clients.length === 0 ? (
        <>
          <p>La vista previa muestra el programa de un alumno. Cargá uno para verla.</p>
          <Link className="vista-alumno__item" to="/admin/clientes/nuevo">
            Cargar alumno
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </>
      ) : (
        <>
          <p>Elegí un alumno para ver lo que ve en su celular. Nada de lo que hagas acá se guarda.</p>
          <ul className="vista-alumno__list">
            {clients.map(client => (
              <li key={client.id}>
                <Link className="vista-alumno__item" to={`/vista-alumno/${client.id}`}>
                  {client.nombre} {client.apellido}
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <p style={{ marginTop: 20 }}>
        <Link to="/admin/dashboard" style={{ color: 'inherit' }}>Volver al panel</Link>
      </p>
    </div>
  )
}
