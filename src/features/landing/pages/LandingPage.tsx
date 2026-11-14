import { useEffect, useRef, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import Logo from '../../../components/Logo'
import './LandingPage.css'

const SIGN_UP = '/login?modo=registro'
const YEAR = new Date().getFullYear()

const sample = [
  { serie: 1, ejercicio: 'Sentadilla', reps: '8', carga: '60 kg' },
  { serie: 2, ejercicio: 'Sentadilla', reps: '8', carga: '65 kg' },
  { serie: 3, ejercicio: 'Sentadilla', reps: '8', carga: '65 kg', now: true },
  { serie: 4, ejercicio: 'Sentadilla', reps: '8', carga: null },
]

const steps = [
  { title: 'Armá la rutina', text: 'Bloques, series, repeticiones y descanso, con tus propios ejercicios y videos.' },
  { title: 'Cargá a tu alumno', text: 'Nombre y correo. Le asignás las rutinas que le tocan.' },
  { title: 'Pasale tu link', text: 'Tenés una página de acceso propia, con tu nombre. Es la misma para todos tus alumnos.' },
  { title: 'Pone su correo y entrena', text: 'La primera vez crea su contraseña. Sin instalar nada: cae directo en sus rutinas y registra cada serie.' },
]

const features = [
  ['Rutinas', 'Editalas cuando quieras. Las sesiones ya hechas conservan lo que se entrenó ese día.'],
  ['Banco de ejercicios', 'El tuyo: con instrucciones y video de YouTube o Vimeo.'],
  ['Cargas e historial', 'Cada alumno ve cuánto levantó antes. Vos ves lo que registra.'],
  ['Finanzas', 'Un libro diario de entradas y salidas, con el resumen de cada mes.'],
  ['Vista previa', 'Mirá la pantalla de cualquier alumno sin tocar sus datos.'],
  ['Tus datos, separados', 'Cada entrenador ve solo a sus alumnos. Lo controla la base de datos, no un botón.'],
]

/** Index for staggering rows when the scroll-driven path is not available */
const order = (i: number) => ({ '--i': i }) as CSSProperties

/**
 * Rows are ruled and written as they scroll in. Browsers with scroll-driven
 * animations do it in CSS; the rest get the same keyframes, started once a row
 * enters the screen. Content stays visible if none of this runs.
 */
function useRowsOnScroll() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el || CSS.supports('animation-timeline: view()')) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return

    el.classList.add('landing--io')
    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-in')
        observer.unobserve(entry.target)
      }),
      { rootMargin: '0px 0px -12% 0px' },
    )
    el.querySelectorAll('.landing-rows').forEach(rows => observer.observe(rows))
    return () => observer.disconnect()
  }, [])

  return root
}

export default function LandingPage() {
  const root = useRowsOnScroll()

  return (
    <div className="landing" ref={root}>
      <header className="landing-nav">
        <Link to="/" className="landing-nav__home" aria-label="TrainerOS, inicio">
          <Logo />
        </Link>
        <nav aria-label="Cuenta">
          <a href="#alumnos" className="landing-nav__link landing-nav__link--student">Soy alumno</a>
          <Link to="/login" className="landing-nav__link">Entrar</Link>
          <Link to={SIGN_UP} className="landing-nav__cta">
            Crear cuenta<span className="landing-nav__cta-extra">gratis</span>
          </Link>
        </nav>
      </header>

      <section className="landing-hero">

        <div className="landing-hero__body">
          <h1 className="landing-hero__title"><span>Dejá la planilla.</span> <span>Lo que armás es lo que entrenan.</span></h1>
          <div className="landing-hero__offer">
            <p>
              Armá rutinas, pasale tu link a cada alumno y seguí desde el panel las series que registra en el
              celular. Crear tu cuenta es gratis.
            </p>
            <div className="landing-hero__actions">
              <Link to={SIGN_UP} className="btn-marker landing-cta">
                Crear mi cuenta gratis
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a href="#alumnos" className="landing-hero__student">Soy alumno</a>
            </div>
          </div>
        </div>

        <figure className="landing-sheet">
          <figcaption>Ejemplo de lo que ve un alumno en el gimnasio</figcaption>
          <table>
            <thead>
              <tr><th>Serie</th><th>Ejercicio</th><th>Reps</th><th>Carga</th></tr>
            </thead>
            <tbody>
              {sample.map((row, i) => (
                <tr key={row.serie} className={row.now ? 'marker' : undefined} style={order(i)}>
                  <td>{row.serie}</td>
                  <td>{row.ejercicio}</td>
                  <td>{row.reps}</td>
                  <td>{row.carga ?? 'Falta'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      </section>

      <section className="landing-section" aria-labelledby="landing-how">
        <h2 id="landing-how" className="landing-section__title">Tu primer alumno entrena hoy</h2>
        <ol className="landing-steps landing-rows">
          {steps.map((step, i) => (
            <li key={step.title} style={order(i)}>
              <span className="landing-steps__number" aria-hidden="true">{i + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="landing-inline-cta">
          <p>Te lleva unos minutos: creás la cuenta y ya tenés tu link para pasar.</p>
          <Link to={SIGN_UP} className="btn-primary landing-cta">
            Armar mi primera rutina
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="landing-section landing-section--sheet" aria-labelledby="landing-features">
        <h2 id="landing-features" className="landing-section__title">Lo que trae, sin vueltas</h2>
        <dl className="landing-features landing-rows">
          {features.map(([name, text], i) => (
            <div key={name} style={order(i)}>
              <dt><Check size={18} strokeWidth={2} aria-hidden="true" />{name}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
        <div className="landing-inline-cta">
          <p>Todo esto es gratis y no te pedimos tarjeta.</p>
          <Link to={SIGN_UP} className="btn-primary landing-cta">
            Crear mi cuenta gratis
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link to="/login" className="landing-inline-cta__link">Ya tengo cuenta</Link>
        </div>
      </section>

      <section id="alumnos" className="landing-student" aria-labelledby="landing-student">
        <h2 id="landing-student">¿Te entrena alguien que usa TrainerOS?</h2>
        <p>
          Pedile a tu entrenador su link. Lo abrís, ponés el correo que le diste y la primera vez creás tu
          contraseña. No hace falta registrarte ni instalar nada.
        </p>
      </section>

      <section className="landing-close">
        <h2>Tu próxima rutina ya no va en una planilla.</h2>
        <Link to={SIGN_UP} className="btn-marker landing-cta">
          Crear mi cuenta gratis
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <footer className="landing-foot">
        <div>
          <Logo />
          <p>© {YEAR} Tucoding. Todos los derechos reservados.</p>
        </div>
        <nav aria-label="Información legal y contacto">
          <Link to="/privacidad">Política de privacidad</Link>
          <Link to="/terminos">Términos y condiciones</Link>
          <a href="mailto:tucoding15@gmail.com">Contacto</a>
        </nav>
      </footer>
    </div>
  )
}
