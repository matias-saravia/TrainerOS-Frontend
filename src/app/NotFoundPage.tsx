import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import './NotFoundPage.css'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="not-found">
      <Logo />
      <div className="not-found__body">
        <p className="not-found__code" aria-hidden="true">404</p>
        <h1 className="not-found__title">Esta página no existe</h1>
        <p className="not-found__text">El link está mal escrito o la página ya no está. Volvé al inicio o a la página anterior.</p>
        <div className="not-found__actions">
          <button className="btn-marker" onClick={() => navigate('/')}>Ir al inicio</button>
          <button className="not-found__back" onClick={() => navigate(-1)}>Volver atrás</button>
        </div>
      </div>
    </div>
  )
}
