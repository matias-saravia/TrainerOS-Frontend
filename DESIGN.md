---
name: TrainerOS
description: Hoja de Series. Rutinas y alumnos leídos como el programa impreso de un torneo, con tu fila marcada con resaltador.
colors:
  deep-navy: "#0F1A2B"
  midnight-blue: "#1C2E4A"
  navy-raised: "#2A4065"
  navy-rule: "#33486A"
  dusty-blue: "#4A5F76"
  on-navy-2: "#B9C6D6"
  ivory: "#BCC8D6"
  rule: "#DDE4EC"
  paper: "#E9EEF5"
  surface-low: "#F4F7FA"
  surface: "#FFFFFF"
  ink: "#0F1A2B"
  ink-2: "#3D4F64"
  outline: "#6A7C90"
  marker: "#E6F23C"
  marker-deep: "#D3DF22"
  success: "#17734C"
  success-bg: "#DDF1E7"
  warning: "#8A5A00"
  warning-bg: "#FBEFD0"
  error: "#A3261C"
  error-bg: "#FBE5E2"
typography:
  display-page:
    fontFamily: "Sofia Sans Extra Condensed Variable, Arial Narrow, sans-serif"
    fontSize: "clamp(38px, 4.4vw, 60px)"
    fontWeight: 800
    lineHeight: 0.95
  display-section:
    fontFamily: "Sofia Sans Extra Condensed Variable, Arial Narrow, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1
  numeral-lead:
    fontFamily: "Sofia Sans Extra Condensed Variable, Arial Narrow, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1
  body:
    fontFamily: "Sofia Sans Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Sofia Sans Variable, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: "3px"
  lg: "4px"
spacing:
  gutter-mobile: "16px"
  gutter-desktop: "40px"
  sheet-gap: "16px"
  cell-x: "20px"
components:
  button-primary:
    backgroundColor: "{colors.midnight-blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    height: "42px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.navy-raised}"
    textColor: "{colors.surface}"
  button-marker:
    backgroundColor: "{colors.marker}"
    textColor: "{colors.deep-navy}"
    rounded: "{rounded.sm}"
    height: "42px"
    padding: "0 16px"
  button-marker-hover:
    backgroundColor: "{colors.marker-deep}"
    textColor: "{colors.deep-navy}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.midnight-blue}"
    rounded: "{rounded.sm}"
    height: "42px"
    padding: "0 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "44px"
  sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
---

# Design System: TrainerOS

## Overview

Un programa de torneo de natación o atletismo: columnas fijas, numerales condensados, tinta azul marino sobre papel frío, y la fila que te importa marcada con resaltador. El mundo aporta tipografía, paleta, densidad y un gesto propio; la estructura y los controles siguen siendo los de una aplicación web normal.

La escena decide el color: el entrenador trabaja en escritorio sobre papel claro con un riel azul marino; el alumno entrena en el gimnasio sobre azul marino completo, y solo su ejercicio activo es una hoja blanca.

## Colors

### Primary
- **Midnight Blue** (`#1C2E4A`): tinta principal, títulos, botón primario y franja de cifras.
- **Deep Navy** (`#0F1A2B`): riel lateral, navegación móvil y todo el fondo del área del alumno.

### Secondary
- **Marker** (`#E6F23C`): el resaltador. Solo significa "esto es ahora" o "esto te necesita".

### Neutral
- **Paper** (`#E9EEF5`): fondo del entrenador.
- **Surface** (`#FFFFFF`): hojas y campos.
- **Ivory** (`#BCC8D6`) y **Rule** (`#DDE4EC`): bordes y líneas de fila.
- **Dusty Blue** (`#4A5F76`) e **Ink 2** (`#3D4F64`): texto secundario sobre claro. **On Navy 2** (`#B9C6D6`): texto secundario sobre azul.

### Named Rules
**La regla del resaltador.** Una pantalla marca lo que hoy requiere acción y nada más: la fila pendiente, la serie actual, la acción principal del alumno. Nunca decora. En el panel, además, es el color de la acción fija "Nuevo alumno" y del ícono activo del riel.

**La regla del dato real.** Cada número en pantalla viene de la base de datos. Los ejemplos ilustrativos se rotulan "Ejemplo".

## Typography

**Display:** Sofia Sans Extra Condensed, en mayúsculas, para títulos y cifras.
**Body:** Sofia Sans, con numerales tabulares en todas partes.

### Hierarchy
- **Página** (800, hasta 60px, interlineado 0.95): título de cada vista. En el alumno sube a 72px.
- **Sección** (800, 28px): título de una hoja.
- **Numeral principal** (800, 30px): primera columna de una tabla, siempre con dato real como la semana. En sesión llega a 44px para la carga.
- **Cuerpo** (400, 15px): texto corriente.
- **Etiqueta** (600, 13-14px): encabezados de tabla y campos, en frase, sin espaciado ancho.

### Named Rules
**Sin antetítulos.** El título habla solo; no hay etiquetas pequeñas encima.

## Layout

Margen único: 40px en escritorio, 16px bajo 768px, con 16px entre hojas. El riel mide 232px y en celular se convierte en barra inferior de cinco ítems. Toda lista se escribe como tabla de columnas fijas; bajo 900px las filas densas se apilan en entradas de dos líneas sin cambiar el orden. El área del alumno se limita a 640px de ancho y sus objetivos táctiles miden al menos 44px.

## Elevation & Depth

Plano por diseño: la jerarquía viene de la línea y el color. La sombra existe solo en modales y hojas superpuestas.

### Named Rules
**Sin elevación en reposo.** Las hojas tienen borde de 1px, nunca sombra ni elevación al pasar el mouse.

## Shapes

Radios de 3px en controles y 4px en hojas. Las marcas de estado son cuadrados de 9px y el progreso se dibuja con segmentos rectos, nunca con anillos ni puntos.

## Components

### Buttons
- **Primario:** azul medianoche, texto blanco, 42px. **Resaltador:** para la acción de este momento. **Secundario:** blanco con borde marfil. **Peligro:** borde y texto rojos.
- Foco: contorno de 2px, azul sobre claro y resaltador sobre azul.

### Sheet
Contenedor único del sistema: fondo blanco, borde de 1px, cabecera con línea inferior azul de 2px y título condensado. Nunca se anidan.

### Hoja (tabla)
`.hoja`: encabezados de 13px, filas con línea de 1px, primera columna en numeral condensado. Una fila `.marker` recibe el resaltador con un barrido de izquierda a derecha de 0.5s; es la única animación propia del sistema.

### Inputs
44px, fondo blanco, borde marfil; al enfocar, contorno azul de 2px. Error: borde rojo y mensaje que nombra cómo resolverlo. En la sesión del alumno, la carga se escribe en numeral de 44px y 64px de alto.

### Navigation
Riel azul marino con ítems de 42px; el activo eleva el fondo y pinta el ícono con resaltador. Iconos Lucide de 1.5px.

### Tarjeta de ejercicio
Sobre azul, con contorno. Solo el ejercicio activo es hoja blanca y muestra el video; el resto mantiene su registro disponible.

## Do's and Don'ts

- **Do:** usar `.hoja` para cualquier lista de entidades.
- **Do:** escribir en español rioplatense con voseo y en frase.
- **Do:** escribir colores con los tokens de `src/index.css`.
- **Don't:** usar emojis ni caracteres Unicode como íconos.
- **Don't:** usar el resaltador como decoración o en más de una idea por pantalla.
- **Don't:** volver a grillas de tarjetas con métricas, anillos de progreso o bordes laterales de color.
- **Don't:** mostrar datos inventados; Finanzas sigue siendo "todavía no está listo" hasta que exista.
