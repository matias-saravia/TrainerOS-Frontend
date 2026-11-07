import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import Logo from '../../../components/Logo'
import './LandingPage.css'

const SIGN_UP = '/login?modo=registro'

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
  { title: 'Pone su correo y entrena', text: 'Sin contraseña y sin instalar nada. Cae directo en sus rutinas y registra cada serie.' },
]

const features = [
  ['Rutinas', 'Editalas cuando quieras. Las sesiones ya hechas conservan lo que se entrenó ese día.'],
  ['Banco de ejercicios', 'El tuyo: con instrucciones y video de YouTube o Vimeo.'],
  ['Cargas e historial', 'Cada alumno ve cuánto levantó antes. Vos ves lo que registra.'],
  ['Finanzas', 'Un libro diario de entradas y salidas, con el resumen de cada mes.'],
  ['Vista previa', 'Mirá la pantalla de cualquier alumno sin tocar sus datos.'],
  ['Tus datos, separados', 'Cada entrenador ve solo a sus alumnos. Lo controla la base de datos, no un botón.'],
]

export default function LandingPage() {
  return (
    <div className="landing">
      <section className="landing-hero">
        <header className="landing-nav">
          <Logo />
          <nav aria-label="Cuenta">
            <Link to="/login" className="landing-nav__link">Entrar</Link>
            <Link to={SIGN_UP} className="landing-nav__link landing-nav__link--strong">Crear cuenta</Link>
          </nav>
        </header>

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
              {sample.map(row => (
                <tr key={row.serie} className={row.now ? 'marker' : undefined}>
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
        <ol className="landing-steps">
          {steps.map((step, i) => (
            <li key={step.title}>
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
        <dl className="landing-features">
          {features.map(([name, text]) => (
            <div key={name}>
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
          Pedile a tu entrenador su link. Lo abrís, ponés el correo que le diste y ves tus rutinas.
          No necesitás crear una cuenta.
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
          <p>Hecho por Tucoding.</p>
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
