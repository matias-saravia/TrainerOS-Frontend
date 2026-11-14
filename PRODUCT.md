# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Entrenador personal:** arma rutinas y ejercicios, carga a sus alumnos y sigue su progreso, sobre todo desde el escritorio, entre clases.
- **Alumno:** entrena desde el celular, en el gimnasio, con una mano ocupada y entre series. Entra con el link de su entrenador, su correo y una contraseña que crea la primera vez.

Ambos pesan por igual.

## Product Purpose

App gratuita para entrenadores personales: gestionan clientes y rutinas, y cada alumno entrena y registra su progreso desde el celular. Tiene éxito cuando el entrenador deja de usar planillas y el alumno registra cada serie sin fricción.

## Positioning

Un entrenador y sus alumnos comparten el mismo programa: lo que el entrenador arma es exactamente lo que el alumno ve y registra, y el entrenador puede ver la pantalla de cualquier alumno en vista previa de solo lectura.

## Operating Context

- Cada entrenador tiene un link propio (`/t/su-nombre`) que comparte con sus alumnos.
- La sesión de entrenamiento se usa en el gimnasio: luz variable, pantalla chica, atención breve.
- Conceptos del dominio: rutina, bloque, ejercicio, serie, repeticiones, carga, sesión, semana de programa.

## Capabilities and Constraints

- Entrenador: panel general, clientes (alta y edición), rutinas, banco de ejercicios, asignación de rutinas, vista previa de alumno.
- Alumno: programa, sesión de entrenamiento, detalle de ejercicio, registro de cargas e historial.
- Finanzas es un libro diario de entradas y salidas cargadas a mano, sin categorías (el concepto es texto libre), con resumen por mes. Los movimientos se anulan con motivo, no se borran. Vincular un alumno a una entrada solo lo anota: no hay cuotas, vencimientos ni cambios en el estado de pago, y el concepto es libre (una mensualidad, 4 meses de preparación). No procesa pagos. No mostrar datos financieros inventados.
- Stack: React 19, TypeScript, Vite, TanStack Query, Supabase. Sin backend propio; los permisos viven en RLS.
- Idioma de la interfaz: español rioplatense.

## Brand Commitments

- Nombre: TrainerOS.
- Isotipo: la letra T fusionada con la silueta de un atleta en dominada. Sin archivo de logo en el repo todavía (`public/favicon.svg` es el de Vite).
- La familia de color azul marino del brandbook se conserva (Midnight Blue `#1C2E4A`, Deep Navy `#0F1A2B`, Dusty Blue `#52677D`). Decisión del dueño del producto: el color se queda; tipografía, composición y componentes se reemplazan.
- Sin emojis en la interfaz. Íconos con Lucide.

## Evidence on Hand

- Brandbook y mockups anteriores en `docs/mockups/` (referencia histórica, reemplazada salvo el color).
- No hay testimonios, clientes, métricas ni precios reales: no inventarlos. Todo número en pantalla debe salir de datos reales.

## Product Principles

1. Cada número en pantalla es real y accionable; nada decorativo que parezca dato.
2. En el gimnasio manda el pulgar: registrar una serie es lo más rápido de toda la app.
3. El entrenador ve de un vistazo quién entrena y a quién tiene que mirar.
4. Claridad antes que marketing: la interfaz habla como un entrenador, no como un folleto de software.

## Accessibility & Inclusion

WCAG AA de contraste y objetivos táctiles de al menos 44px en el área del alumno, por el contexto de uso en el gimnasio.
