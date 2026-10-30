/* eslint-disable react-refresh/only-export-components -- route table, not a component module */
import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage, ProtectedRoute, ResetPasswordPage, RootRedirect, TrainerAccessPage } from '../features/auth'
import NotFoundPage from './NotFoundPage'

const AdminLayout = lazy(() => import('../features/admin/components/AdminLayout'))
const DashboardPage = lazy(() => import('../features/admin/pages/DashboardPage'))
const ClientesPage = lazy(() => import('../features/admin/pages/ClientesPage'))
const NuevoClientePage = lazy(() => import('../features/admin/pages/NuevoClientePage'))
const EntrenamientosPage = lazy(() => import('../features/admin/pages/EntrenamientosPage'))
const ArmarRutinaPage = lazy(() => import('../features/admin/pages/ArmarRutinaPage'))
const FinanzasPage = lazy(() => import('../features/admin/pages/FinanzasPage'))
const ExerciseBankPage = lazy(() => import('../features/exercises/pages/ExerciseBankPage'))
const NuevoEjercicioPage = lazy(() => import('../features/exercises/pages/NuevoEjercicioPage'))
const ClientLayout = lazy(() => import('../features/client/components/ClientLayout'))
const ClientDashboard = lazy(() => import('../features/client/pages/ClientDashboard'))
const WorkoutSessionPage = lazy(() => import('../features/client/pages/WorkoutSessionPage'))
const ExerciseDetailPage = lazy(() => import('../features/client/pages/ExerciseDetailPage'))

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
    path: '/restablecer-contrasena',
    element: <ResetPasswordPage />,
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
      { path: 'entrenamientos/rutinas/:id/editar',    element: <ArmarRutinaPage /> },
      { path: 'entrenamientos/ejercicios',            element: <ExerciseBankPage /> },
      { path: 'entrenamientos/ejercicios/nuevo',      element: <NuevoEjercicioPage /> },
      { path: 'entrenamientos/ejercicios/:id/editar', element: <NuevoEjercicioPage /> },
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
