import './PlaceholderPage.css'

export default function FinanzasPage() {
  return (
    <div className="placeholder-page">
      <header className="page-header">
        <h1 className="page-header__title">Finanzas</h1>
      </header>
      <div className="sheet placeholder-content">
        <h2 className="placeholder-title">Todavía no está listo</h2>
        <p className="placeholder-desc">
          Acá vas a poder controlar ingresos, pagos pendientes y el estado de cada alumno.
          Por ahora no hay nada para cargar.
        </p>
      </div>
    </div>
  )
}
