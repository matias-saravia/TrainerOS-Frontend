import type { Tables } from '../../../lib/supabase'

// ─── Types ─────────────────────────────────────────────────────────
export type BlockType = 'single' | 'superset'

export interface BlockExercise {
  id: string          // unique within block
  exercise: Tables<'exercises'>
  sets: number
  reps: string        // e.g. "8-10" or "12"
  tempo?: string      // e.g. "2-0-1-0"
  notes?: string
}

export interface Block {
  id: string
  label: string       // e.g. "A", "B"
  type: BlockType
  exercises: BlockExercise[]
}

export interface Routine {
  id: string
  nombre: string
  dia?: string        // e.g. "Día 1: Empuje – Hipertrofia"
  blocks: Block[]
}

// ─── Helpers ───────────────────────────────────────────────────────
export function makeBlockLabel(index: number): string {
  return String.fromCharCode(65 + index) // A, B, C...
}

export function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
