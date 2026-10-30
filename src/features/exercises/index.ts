// Barrel export for the exercises feature
export { default as ExerciseBankPage }    from './pages/ExerciseBankPage'
export { default as NuevoEjercicioPage }  from './pages/NuevoEjercicioPage'
export { default as ExerciseCard }        from './components/ExerciseCard'
export { default as ClientPreview }       from './components/ClientPreview'
export type { Exercise, MuscleGroup, Difficulty } from './api/exercises.api'
export { MUSCLE_GROUPS }  from './api/exercises.api'
export {
  useExercises,
  useExercise,
  useCreateExercise,
  useUpdateExercise,
  useDeleteExercise,
} from './hooks/useExercises'
export type {
  ExerciseRow,
  ExerciseInsert,
  ExerciseUpdate,
  UpdateExerciseInput,
} from './hooks/useExercises'

