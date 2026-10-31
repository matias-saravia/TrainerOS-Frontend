import { useParams } from 'react-router-dom'

/**
 * Tells the student pages whether a trainer is previewing them.
 * Only the /vista-alumno routes, restricted to trainers, carry :clienteId.
 */
export function useStudentArea() {
  const { clienteId } = useParams()

  return {
    previewClientId: clienteId,
    isPreview: Boolean(clienteId),
    basePath: clienteId ? `/vista-alumno/${clienteId}` : '/alumno',
  }
}
