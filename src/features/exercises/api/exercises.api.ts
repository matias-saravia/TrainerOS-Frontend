// ─── Exercise Types ────────────────────────────────────────────────
export type MuscleGroup =
  | 'Pecho'
  | 'Espalda'
  | 'Piernas'
  | 'Hombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Core'
  | 'Glúteos'

export type Difficulty = 'Principiante' | 'Intermedio' | 'Avanzado'

export interface Exercise {
  id: string
  nombre: string
  grupoMuscular: MuscleGroup
  gruposSecundarios?: MuscleGroup[]
  dificultad: Difficulty
  instrucciones: string[]
  videoUrl?: string
  imagenUrl?: string
  duracionEstimada?: number // segundos
  series?: number
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Pecho',
  'Espalda',
  'Piernas',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Core',
  'Glúteos',
]
