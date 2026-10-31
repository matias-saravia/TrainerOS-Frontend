---
version: 1
slug: "src-app-router-tsx"
primary_target: "src/app/router.tsx"
related_targets: []
---

Scope: toda la app web de TrainerOS (panel del entrenador, área del alumno, acceso). Modo: Operate.
Audiencia, tarea y restricciones: ver PRODUCT.md. Build code-led. Azul marino fijado por el dueño.

## Direction contract

THESIS: Cada rutina y cada lista de alumnos se lee como una hoja de series de torneo: columnas fijas, números de orden, y tu fila marcada con resaltador. Rechaza la grilla bento de tarjetas con métricas sueltas.
OWN-WORLD: Tinta azul marino (#1C2E4A, #0F1A2B) sobre papel celeste frío (#E9EEF5), hojas blancas con línea de 1px, resaltador flúo (#E6F23C) reservado solo para "esto es ahora / esto requiere acción". Numerales Sofia Sans Extra Condensed, texto Sofia Sans tabular. Radios de 3-4px. Sin sombras decorativas. Lucide 1.5px. Controles web estándar. Raises: columnas fijas y el estado solo reestiliza la fila (split-flap); solo el ejercicio activo a plena fuerza (streaming); nada se rotula dos veces (Saville); el color manda en regiones enteras (zoo); un grosor de línea y marcas de estado únicas (riel); una grilla modular (Crouwel).
STORY: El entrenador entiende de un vistazo quién entrena y a quién mirar; confía porque cada número es real; actúa desde la fila. El alumno ve su próxima serie y la registra con el pulgar.
FIRST VIEWPORT: Escritorio: riel azul marino de 232px con logo, navegación y acción Nuevo alumno. Título condensado grande con la fecha de hoy, link del entrenador a la derecha, franja azul marino de 3-4 cifras reales, debajo hoja blanca a todo el ancho con alumnos numerados y la fila que requiere atención resaltada. Celular alumno: fondo azul marino, nombre, rutina de hoy con botón amarillo a pulgar. Firma: la marca de resaltador en la fila actual; aparece con un barrido de izquierda a derecha.
FORM: Hoja de Series, posición 4 de la lista ordenada. seed:730bd635d218761c
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
