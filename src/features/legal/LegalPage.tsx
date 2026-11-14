import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import './LegalPage.css'

const CONTACT = 'tucoding15@gmail.com'
const UPDATED = '14 de noviembre de 2026'
const YEAR = new Date().getFullYear()

type LegalDoc = 'privacidad' | 'terminos'

const TITLES: Record<LegalDoc, string> = {
  privacidad: 'Política de privacidad',
  terminos: 'Términos y condiciones',
}

function Mail() {
  return <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="legal__section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function Privacy() {
  return (
    <>
      <p className="legal__lead">
        Acá explicamos qué datos guarda TrainerOS, para qué los usa, con quién se comparten y cómo pedir que los
        corrijamos o los borremos.
      </p>

      <Section title="Quiénes somos">
        <p>
          TrainerOS es una aplicación gratuita hecha por Tucoding. Para cualquier consulta sobre tus datos, escribinos
          a <Mail />.
        </p>
      </Section>

      <Section title="Quién decide sobre cada dato">
        <p>
          Los datos de la cuenta de un entrenador los administramos nosotros, como responsables. Los datos de cada
          alumno los carga su entrenador: él decide qué cargar y para qué, y nosotros los guardamos y procesamos por
          su cuenta, solo para que la aplicación funcione.
        </p>
        <p>
          Si sos alumno y querés saber qué datos tuyos cargó tu entrenador, podés pedírselo a él o escribirnos.
        </p>
      </Section>

      <Section title="Qué datos guardamos">
        <h3>Si sos entrenador</h3>
        <ul>
          <li>Nombre, apellido y correo.</li>
          <li>
            Tu contraseña, guardada cifrada: nadie puede leerla, tampoco nosotros. Si entrás con Google, recibimos
            de Google tu nombre y tu correo, nunca tu contraseña de Google.
          </li>
          <li>Las rutinas, los ejercicios y los videos que cargás.</li>
          <li>Los movimientos de Finanzas que anotás a mano. TrainerOS no procesa pagos.</li>
        </ul>
        <h3>Si sos alumno</h3>
        <ul>
          <li>
            Lo que carga tu entrenador: nombre, correo y, si los completa, teléfono, fecha de nacimiento, objetivo,
            medidas (peso, altura, grasa corporal), historial médico, consideraciones y el estado de tus pagos con
            él.
          </li>
          <li>Lo que registrás vos: las sesiones, las series que completás y las cargas que usás.</li>
        </ul>
        <h3>Datos técnicos</h3>
        <ul>
          <li>
            Para frenar intentos de entrar con correos ajenos, guardamos el correo y la dirección IP de cada intento
            de acceso de alumnos. Se borran solos después de un día.
          </li>
          <li>
            Tu sesión queda guardada en tu navegador para que no tengas que volver a entrar. No usamos cookies de
            publicidad ni herramientas de análisis.
          </li>
        </ul>
      </Section>

      <Section title="Datos de salud">
        <p>
          El historial médico, las consideraciones y las medidas corporales son datos sensibles según la Ley 25.326.
          Son opcionales y solo los carga el entrenador, que debe tener el consentimiento expreso del alumno para
          hacerlo. Los ven únicamente ese entrenador y el propio alumno.
        </p>
      </Section>

      <Section title="Para qué los usamos">
        <p>
          Solo para que TrainerOS funcione: mostrarle a cada entrenador sus alumnos y rutinas, dejar que cada alumno
          entrene y registre su progreso, y mandar los correos de acceso y de recuperación de contraseña. No vendemos
          datos, no los usamos para publicidad y no se los mostramos a otros entrenadores.
        </p>
      </Section>

      <Section title="Con quién se comparten">
        <p>Usamos estos servicios para que la aplicación funcione:</p>
        <ul>
          <li>
            <strong>Supabase:</strong> guarda la base de datos, maneja el inicio de sesión y envía los correos.
          </li>
          <li>
            <strong>Vercel:</strong> publica la aplicación.
          </li>
          <li>
            <strong>Google:</strong> solo si elegís entrar con tu cuenta de Google.
          </li>
          <li>
            <strong>YouTube y Vimeo:</strong> cuando reproducís un video de un ejercicio, esa plataforma puede recibir
            datos de tu navegador según su propia política.
          </li>
        </ul>
        <p>
          Algunos de estos servicios guardan datos fuera de Argentina. Solo los usamos para prestar el servicio y con
          medidas de seguridad equivalentes a las que exige la ley.
        </p>
      </Section>

      <Section title="Cuánto tiempo los guardamos">
        <p>
          Mientras la cuenta exista. Si un entrenador borra a un alumno, se borran también sus sesiones, series y
          cargas; los movimientos de Finanzas quedan, sin el vínculo con ese alumno. La cuenta de acceso del alumno
          queda vacía, y podés pedirnos que la borremos. Si pedís borrar tu cuenta de entrenador, se borra con todo lo
          que cargaste.
        </p>
      </Section>

      <Section title="Tus derechos">
        <p>
          Podés pedir ver, corregir, actualizar o borrar tus datos escribiendo a <Mail /> desde el correo de tu
          cuenta. Respondemos los pedidos de acceso dentro de los 10 días corridos y los de corrección o borrado
          dentro de los 5 días hábiles.
        </p>
        <p>
          El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma
          gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto
          conforme lo establecido en el artículo 14, inciso 3 de la Ley N° 25.326.
        </p>
        <p>
          La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N° 25.326,
          tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus
          derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.
        </p>
      </Section>

      <Section title="Seguridad">
        <p>
          Las conexiones viajan cifradas, las contraseñas se guardan cifradas y la base de datos impide que un
          entrenador vea los datos de otro. El acceso de alumnos no usa contraseña: entra quien conoce el link del
          entrenador y el correo cargado. Por eso conviene no compartir ese correo.
        </p>
        <p>
          Ningún sistema es completamente seguro. Si ocurriera un incidente que afecte tus datos, te vamos a avisar.
        </p>
      </Section>

      <Section title="Menores de edad">
        <p>
          Las cuentas de entrenador son para mayores de 18 años. Para cargar a un alumno menor de edad, el entrenador
          necesita el consentimiento de su madre, padre o tutor.
        </p>
      </Section>

      <Section title="Cambios en esta política">
        <p>
          Si cambiamos algo importante, lo avisamos en la aplicación antes de que se aplique. La fecha de arriba
          indica la última actualización.
        </p>
      </Section>
    </>
  )
}

function Terms() {
  return (
    <>
      <p className="legal__lead">
        Estas son las reglas para usar TrainerOS. Al crear una cuenta o entrar como alumno, las aceptás.
      </p>

      <Section title="Qué es TrainerOS">
        <p>
          Una herramienta gratuita, hecha por Tucoding, para que los entrenadores personales armen rutinas, carguen a
          sus alumnos y sigan sus entrenamientos, y para que cada alumno entrene y registre su progreso desde el
          celular. Finanzas es un registro que el entrenador completa a mano: TrainerOS no cobra ni procesa pagos.
        </p>
      </Section>

      <Section title="Tu cuenta">
        <ul>
          <li>Para tener una cuenta de entrenador tenés que ser mayor de 18 años y usar datos reales.</li>
          <li>Cuidá tu contraseña. Lo que se haga con tu cuenta es tu responsabilidad.</li>
          <li>
            Los alumnos entran con el link de su entrenador, el correo que él cargó y una contraseña que crean la
            primera vez. Hasta que el alumno la crea, cualquiera que conozca el link y el correo podría crearla en su
            lugar; si pasa, el entrenador la restablece desde su panel y el alumno crea una nueva.
          </li>
        </ul>
      </Section>

      <Section title="Lo que le toca al entrenador">
        <ul>
          <li>
            Cargar solo datos de personas que lo autorizaron. Para datos de salud, como el historial médico,
            necesitás su consentimiento expreso; si el alumno es menor, el de su madre, padre o tutor.
          </li>
          <li>Mantener esos datos correctos y borrarlos cuando el alumno lo pida.</li>
          <li>
            Las rutinas, cargas e indicaciones que das son tu responsabilidad profesional. TrainerOS solo las muestra.
          </li>
        </ul>
      </Section>

      <Section title="Salud y entrenamiento">
        <p>
          TrainerOS no da consejos médicos ni de entrenamiento y no reemplaza la supervisión de un profesional.
          Entrenar implica riesgos: ante cualquier duda sobre tu salud, consultá a un médico antes de empezar o
          seguir una rutina.
        </p>
      </Section>

      <Section title="Uso permitido">
        <p>No está permitido:</p>
        <ul>
          <li>Intentar entrar a cuentas o datos de otras personas.</li>
          <li>Cargar contenido ilegal, ofensivo o que no tengas derecho a usar.</li>
          <li>Usar la aplicación para mandar correos no deseados o para dañar el servicio.</li>
        </ul>
        <p>Podemos suspender o dar de baja una cuenta que no cumpla estas reglas.</p>
      </Section>

      <Section title="Tu contenido">
        <p>
          Las rutinas, ejercicios y datos que cargás siguen siendo tuyos. Solo los guardamos y los mostramos para que
          la aplicación funcione. Los videos de YouTube o Vimeo se rigen por las condiciones de esas plataformas.
        </p>
      </Section>

      <Section title="Propiedad de TrainerOS">
        <p>
          El código, el diseño, el nombre y el logo de TrainerOS son de Tucoding y están protegidos por la Ley 11.723 de
          Propiedad Intelectual. Podés usar la aplicación para tu trabajo, pero no copiarla, revenderla ni usar su
          nombre o su logo sin nuestro permiso.
        </p>
      </Section>

      <Section title="Precio y disponibilidad">
        <p>
          TrainerOS es gratis. Si algún día eso cambia, lo avisaremos con al menos 30 días de anticipación y nunca
          vamos a cobrarte sin que lo aceptes.
        </p>
        <p>
          Hacemos lo posible para que funcione siempre, pero puede tener interrupciones o errores, y podemos cambiar o
          quitar funciones. En la medida en que la ley lo permite, no respondemos por daños derivados de esas
          interrupciones o de la pérdida de datos.
        </p>
      </Section>

      <Section title="Dar de baja tu cuenta">
        <p>
          Escribinos a <Mail /> desde el correo de tu cuenta y la borramos junto con lo que cargaste.
        </p>
      </Section>

      <Section title="Cambios en estos términos">
        <p>
          Si cambiamos algo importante, lo avisamos en la aplicación antes de que se aplique. Seguir usando TrainerOS
          después de ese aviso significa que aceptás los cambios.
        </p>
      </Section>

      <Section title="Ley aplicable">
        <p>
          Estos términos se rigen por las leyes de la República Argentina. Si sos consumidor, mantenés todos los
          derechos que te da la Ley 24.240 de Defensa del Consumidor.
        </p>
      </Section>

      <Section title="Contacto">
        <p>
          Para cualquier consulta, escribinos a <Mail />.
        </p>
      </Section>
    </>
  )
}

export default function LegalPage({ doc }: { doc: LegalDoc }) {
  const other: LegalDoc = doc === 'privacidad' ? 'terminos' : 'privacidad'

  // Moving between the two documents starts each one from the top
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [doc])

  return (
    <div className="legal">
      <header className="legal__nav">
        <Link to="/" aria-label="Ir al inicio de TrainerOS">
          <Logo />
        </Link>
        <Link to="/login" className="legal__nav-link">Entrar</Link>
      </header>

      <article className="legal__doc">
        <h1>{TITLES[doc]}</h1>
        <p className="legal__date">Última actualización: {UPDATED}</p>
        {doc === 'privacidad' ? <Privacy /> : <Terms />}
      </article>

      <footer className="legal__foot">
        <Link to={`/${other}`}>{TITLES[other]}</Link>
        <Link to="/">Volver al inicio</Link>
        <p className="legal__copy">© {YEAR} Tucoding. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
