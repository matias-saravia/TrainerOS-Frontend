// Barrel export for the admin feature
export { default as AdminLayout }        from './components/AdminLayout'
export { default as Sidebar }            from './components/Sidebar'
export { default as DashboardPage }      from './pages/DashboardPage'
export { default as ClientesPage }       from './pages/ClientesPage'
export { default as NuevoClientePage }   from './pages/NuevoClientePage'
export { default as EntrenamientosPage } from './pages/EntrenamientosPage'
export { default as ArmarRutinaPage }    from './pages/ArmarRutinaPage'
export {
  useClients,
  useClient,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from './hooks/useClients'
export {
  useDashboardStats,
  useRecentClients,
  useUpcomingSessions,
  useActivityHeatmap,
} from './hooks/useDashboardStats'
export type {
  ClientRow,
  ClientInsert,
  ClientUpdate,
  UpdateClientInput,
} from './hooks/useClients'
export type {
  DashboardStats,
  UpcomingSessionClient,
  UpcomingSession,
  ActivityHeatmapDay,
} from './hooks/useDashboardStats'

