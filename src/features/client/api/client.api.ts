// ─── Client Feature Types ──────────────────────────────────────────

export interface WeightEntry {
  fecha: string   // ISO date "2026-08-15"
  kg: number
}

export interface SessionExercise {
  id: string
  ejercicioId: string
  nombre: string
  grupoMuscular: string
  categoria: string | null
  series: number
  reps: string          // "8-10" | "12" | "Al fallo"
  descanso: number      // segundos
  pesoObjetivo?: number // kg
  instrucciones: string[]
  videoUrl?: string
  setsCompletados: number
  pesoRegistrado?: number // último kg guardado
}
