import { Pencil } from 'lucide-react'
import type { Tables } from '../../../lib/supabase'
import './ExerciseCard.css'

interface ExerciseCardProps {
  exercise: Tables<'exercises'>
  onEdit?: (ex: Tables<'exercises'>) => void
}

export default function ExerciseCard({ exercise, onEdit }: ExerciseCardProps) {
  return (
    <tr className="exercise-row">
      <td className="hoja__name">{exercise.nombre}</td>
      <td className="exercise-row__muscle">
        <span className="chip">{exercise.grupo_muscular}</span>
        {exercise.grupos_secundarios?.slice(0, 2).map(g => (
          <span key={g} className="exercise-row__secondary">{g}</span>
        ))}
      </td>
      <td className="exercise-row__level">{exercise.dificultad}</td>
      <td className="exercise-row__howto">{exercise.instrucciones[0]}</td>
      <td className="hoja__end">
        {onEdit && (
          <button
            className="icon-action-btn"
            onClick={() => onEdit(exercise)}
            aria-label={`Editar ${exercise.nombre}`}
            title={`Editar ${exercise.nombre}`}
          >
            <Pencil size={16} strokeWidth={1.5} />
          </button>
        )}
      </td>
    </tr>
  )
}
