import { createBrowserRouter, Navigate } from 'react-router-dom'
import AdminLayout from '../features/admin/components/AdminLayout'
import DashboardPage from '../features/admin/pages/DashboardPage'
import ClientesPage from '../features/admin/pages/ClientesPage'
import NuevoClientePage from '../features/admin/pages/NuevoClientePage'
import EntrenamientosPage from '../features/admin/pages/EntrenamientosPage'
import ArmarRutinaPage from '../features/admin/pages/ArmarRutinaPage'
import FinanzasPage from '../features/admin/pages/FinanzasPage'
import ExerciseBankPage from '../features/exercises/pages/ExerciseBankPage'
import NuevoEjercicioPage from '../features/exercises/pages/NuevoEjercicioPage'
import { LoginPage, ProtectedRoute, RootRedirect, TrainerAccessPage } from '../features/auth'
// Client (alumno) feature
import ClientLayout from '../features/client/components/ClientLayout'
import ClientDashboard from '../features/client/pages/ClientDashboard'
import WorkoutSessionPage from '../features/client/pages/WorkoutSessionPage'
import ExerciseDetailPage from '../features/client/pages/ExerciseDetailPage'
import NotFoundPage from './NotFoundPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/t/:slug',
    element: <TrainerAccessPage />,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute requiredRole="trainer">
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard',                            element: <DashboardPage /> },
      { path: 'clientes',                             element: <ClientesPage /> },
      { path: 'clientes/nuevo',                       element: <NuevoClientePage /> },
      { path: 'clientes/:id/editar',                  element: <NuevoClientePage /> },
      { path: 'entrenamientos',                       element: <EntrenamientosPage /> },
      { path: 'entrenamientos/rutinas/nueva',         element: <ArmarRutinaPage /> },
      { path: 'entrenamientos/ejercicios',            element: <ExerciseBankPage /> },
      { path: 'entrenamientos/ejercicios/nuevo',      element: <NuevoEjercicioPage /> },
      { path: 'finanzas',                             element: <FinanzasPage /> },
    ],
  },
  // ── Client (Alumno) routes — completely separate from admin ──
  {
    path: '/alumno',
    element: (
      <ProtectedRoute requiredRole="client">
        <ClientLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <ClientDashboard /> },
      { path: 'sesion/:sesionId', element: <WorkoutSessionPage /> },
      { path: 'sesion/:sesionId/ejercicio/:ejercicioId', element: <ExerciseDetailPage /> },
      // Old /alumno/:clienteId links show no data: they fall back to the login
      { path: '*', element: <Navigate to="/alumno" replace /> },
    ],
  },
  // ── 404 — catch all unmatched routes ──
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export default router
