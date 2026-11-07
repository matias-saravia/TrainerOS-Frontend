import { Link, Outlet } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { useStudentArea } from '../hooks/useStudentArea'
import { RestTimerProvider } from './RestTimer'
import './ClientLayout.css'

export default function ClientLayout() {
  const { isPreview } = useStudentArea()

  return (
    <div className="client-layout">
      {isPreview && (
        <div className="client-layout__preview" role="status">
          <Eye size={15} strokeWidth={2} aria-hidden="true" />
          <span>Vista previa: nada de lo que hagas acá se guarda.</span>
          <Link to="/vista-alumno">Cambiar alumno</Link>
          <Link to="/admin/dashboard">Volver al panel</Link>
        </div>
      )}
      <RestTimerProvider>
        <Outlet />
      </RestTimerProvider>
    </div>
  )
}
