import { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'
import router from './app/router'
import { AuthProvider } from './features/auth'

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </AuthProvider>
  )
}
