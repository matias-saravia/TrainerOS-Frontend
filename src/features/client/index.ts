// Barrel export for the client feature
export { default as ClientLayout }         from './components/ClientLayout'
export { default as ExerciseSessionCard }  from './components/ExerciseSessionCard'
export { default as WeightLogger }         from './components/WeightLogger'
export { default as ExerciseHistoryChart } from './components/ExerciseHistoryChart'
export { default as ClientDashboard }      from './pages/ClientDashboard'
export { default as WorkoutSessionPage }   from './pages/WorkoutSessionPage'
export { default as ExerciseDetailPage }   from './pages/ExerciseDetailPage'
export {
  useMyClient,
  useWorkoutSession,
  useWeightHistory,
  useStartWorkoutSession,
  useLogWorkoutSet,
  useCompleteWorkoutSession,
} from './hooks/useClientDashboard'
export type {
  ClientRow,
  WorkoutSessionRow,
  SessionExerciseRow,
  WeightEntryRow,
  SessionExerciseWithExercise,
  WorkoutSessionWithExercises,
} from './hooks/useClientDashboard'
export type { SessionExercise, WeightEntry } from './api/client.api'
