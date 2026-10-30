import { useState, useCallback } from 'react'
import type { Tables } from '../../../lib/supabase'
import {
  type Block,
  type BlockExercise,
  type BlockType,
  makeId,
  makeBlockLabel,
} from '../api/workouts.api'

interface UseRoutineBuilderReturn {
  routineName: string
  setRoutineName: (name: string) => void
  blocks: Block[]
  addBlock: (exercise: Tables<'exercises'>, type?: BlockType) => void
  addExerciseToBlock: (blockId: string, exercise: Tables<'exercises'>) => void
  loadBlocks: (blocks: Block[]) => void
  removeBlock: (blockId: string) => void
  removeExerciseFromBlock: (blockId: string, exerciseId: string) => void
  updateSetsReps: (blockId: string, exerciseId: string, sets: number, reps: string) => void
  convertToSuperset: (blockId: string) => void
  moveBlock: (fromIndex: number, toIndex: number) => void
  totalExercises: number
  estimatedMinutes: number
}

export function useRoutineBuilder(initialName = ''): UseRoutineBuilderReturn {
  const [routineName, setRoutineName] = useState(initialName)
  const [blocks, setBlocks] = useState<Block[]>([])

  const makeBlockExercise = (exercise: Tables<'exercises'>): BlockExercise => ({
    id: makeId(),
    exercise,
    sets: 3,
    reps: '10',
    tempo: '',
    notes: '',
  })

  // Replace the canvas with a routine being edited
  const loadBlocks = useCallback((loaded: Block[]) => setBlocks(loaded), [])

  // Add a new standalone block with one exercise
  const addBlock = useCallback((exercise: Tables<'exercises'>, type: BlockType = 'single') => {
    setBlocks(prev => {
      const label = makeBlockLabel(prev.length)
      const newBlock: Block = {
        id: makeId(),
        label,
        type,
        exercises: [makeBlockExercise(exercise)],
      }
      return [...prev, newBlock]
    })
  }, [])

  // Add exercise to existing block (turns it into a superset)
  const addExerciseToBlock = useCallback((blockId: string, exercise: Tables<'exercises'>) => {
    setBlocks(prev =>
      prev.map(b => {
        if (b.id !== blockId) return b
        const updated: Block = {
          ...b,
          type: 'superset',
          exercises: [...b.exercises, makeBlockExercise(exercise)],
        }
        return updated
      })
    )
  }, [])

  // Remove entire block
  const removeBlock = useCallback((blockId: string) => {
    setBlocks(prev => {
      const filtered = prev.filter(b => b.id !== blockId)
      // Relabel remaining blocks
      return filtered.map((b, i) => ({ ...b, label: makeBlockLabel(i) }))
    })
  }, [])

  // Remove exercise from block; if last exercise → remove block
  const removeExerciseFromBlock = useCallback((blockId: string, exerciseId: string) => {
    setBlocks(prev => {
      return prev
        .map(b => {
          if (b.id !== blockId) return b
          const remaining = b.exercises.filter(e => e.id !== exerciseId)
          if (remaining.length === 0) return null // mark for removal
          return {
            ...b,
            type: remaining.length === 1 ? 'single' : b.type,
            exercises: remaining,
          } as Block
        })
        .filter((b): b is Block => b !== null)
        .map((b, i) => ({ ...b, label: makeBlockLabel(i) }))
    })
  }, [])

  // Update sets/reps
  const updateSetsReps = useCallback(
    (blockId: string, exerciseId: string, sets: number, reps: string) => {
      setBlocks(prev =>
        prev.map(b => {
          if (b.id !== blockId) return b
          return {
            ...b,
            exercises: b.exercises.map(e =>
              e.id === exerciseId ? { ...e, sets, reps } : e
            ),
          }
        })
      )
    },
    []
  )

  // Explicitly convert single block to superset label
  const convertToSuperset = useCallback((blockId: string) => {
    setBlocks(prev =>
      prev.map(b => (b.id === blockId ? { ...b, type: 'superset' } : b))
    )
  }, [])

  // Reorder blocks (for drag-and-drop)
  const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
    setBlocks(prev => {
      const arr = [...prev]
      const [moved] = arr.splice(fromIndex, 1)
      arr.splice(toIndex, 0, moved)
      return arr.map((b, i) => ({ ...b, label: makeBlockLabel(i) }))
    })
  }, [])

  const totalExercises = blocks.reduce((sum, b) => sum + b.exercises.length, 0)
  const estimatedMinutes = totalExercises * 4 + blocks.length * 2

  return {
    routineName,
    setRoutineName,
    blocks,
    addBlock,
    addExerciseToBlock,
    loadBlocks,
    removeBlock,
    removeExerciseFromBlock,
    updateSetsReps,
    convertToSuperset,
    moveBlock,
    totalExercises,
    estimatedMinutes,
  }
}
