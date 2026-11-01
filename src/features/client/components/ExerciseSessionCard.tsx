import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, X, ExternalLink, FileText, Check } from 'lucide-react'
import type { SessionExercise } from '../api/client.api'
import WeightLogger from './WeightLogger'
import { useStudentArea } from '../hooks/useStudentArea'
import { parseVideoUrl } from '../../../utils/video'
import './ExerciseSessionCard.css'

interface ExerciseSessionCardProps {
  exercise: SessionExercise
  index: number
  onSetComplete: (exerciseId: string, kg: number) => void
  sesionId: string
  readOnly?: boolean
  isActive?: boolean
}

export default function ExerciseSessionCard({
  exercise,
  index,
  onSetComplete,
  sesionId,
  readOnly = false,
  isActive = false,
}: ExerciseSessionCardProps) {
  const navigate = useNavigate()
  const { isPreview, basePath } = useStudentArea()
  const [isPlayingInline, setIsPlayingInline] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const isCompleted = exercise.setsCompletados >= exercise.series

  const video = parseVideoUrl(exercise.videoUrl)
  const hasPlayableVideo = video.type === 'youtube' || video.type === 'vimeo' || video.type === 'direct'
  const isExternal = video.type === 'unsupported' && Boolean(video.rawUrl)

  const handleOpenDetail = () => {
    navigate(`${basePath}/sesion/${sesionId}/ejercicio/${exercise.id}`)
  }

  const handleTogglePlay = () => {
    if (hasPlayableVideo) {
      setIsPlayingInline(prev => !prev)
    } else if (video.rawUrl) {
      window.open(video.rawUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const cardClass = `ex-session-card${isActive ? ' ex-session-card--active' : ''}${isCompleted ? ' ex-session-card--done' : ''}`

  return (
    <article className={cardClass} id={`exercise-card-${exercise.id}`}>
      <div className="ex-session-card__header">
        <span className="ex-session-card__number" aria-hidden="true">{index + 1}</span>
        <div className="ex-session-card__titles">
          <h2 className="ex-session-card__name">{exercise.nombre}</h2>
          {exercise.grupoMuscular && (
            <span className="ex-session-card__muscle">{exercise.grupoMuscular}</span>
          )}
        </div>
        {isCompleted ? (
          <Check className="ex-session-card__check" size={22} strokeWidth={2.5} aria-label="Completado" />
        ) : exercise.categoria && (
          <span className="ex-session-card__chip">{exercise.categoria}</span>
        )}
      </div>

      <div className="ex-session-card__metrics">
        <div>
          <span className="ex-session-card__metric-value">{exercise.series}</span>
          <span className="ex-session-card__metric-label">Series</span>
        </div>
        <div>
          <span className="ex-session-card__metric-value">{exercise.reps}</span>
          <span className="ex-session-card__metric-label">Reps</span>
        </div>
        {exercise.descanso > 0 && (
          <div>
            <span className="ex-session-card__metric-value">{exercise.descanso}s</span>
            <span className="ex-session-card__metric-label">Descanso</span>
          </div>
        )}
      </div>

      <div className="ex-session-card__media-container">
        {isPlayingInline && hasPlayableVideo ? (
          <div className="ex-session-card__player-wrapper">
            <button
              className="ex-session-card__close-video"
              onClick={() => setIsPlayingInline(false)}
              aria-label="Cerrar video"
            >
              <X size={16} strokeWidth={2} />
              Cerrar
            </button>

            {video.type === 'youtube' && video.embedUrl && (
              <iframe
                className="ex-session-card__iframe"
                src={video.embedUrl}
                title={`Video demostrativo de ${exercise.nombre}`}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              />
            )}

            {video.type === 'vimeo' && video.embedUrl && (
              <iframe
                className="ex-session-card__iframe"
                src={video.embedUrl}
                title={`Video demostrativo de ${exercise.nombre}`}
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture"
              />
            )}

            {video.type === 'direct' && video.rawUrl && (
              <video
                className="ex-session-card__native-video"
                src={video.rawUrl}
                controls
                autoPlay
                playsInline
                preload="metadata"
              />
            )}
          </div>
        ) : (hasPlayableVideo || isExternal) && (
          <button
            type="button"
            className={`ex-session-card__media${video.thumbnailUrl ? ' ex-session-card__media--thumb' : ''}`}
            onClick={handleTogglePlay}
            aria-label={`Ver video de ${exercise.nombre}`}
            style={{ width: '100%', background: video.thumbnailUrl ? undefined : 'transparent' }}
          >
            {video.thumbnailUrl && (
              <img
                className="ex-session-card__video-thumb"
                src={video.thumbnailUrl}
                alt=""
                aria-hidden="true"
                loading="lazy"
              />
            )}
            <span className="ex-session-card__media-inner">
              {hasPlayableVideo ? <Play size={16} fill="currentColor" /> : <ExternalLink size={16} />}
              {hasPlayableVideo ? 'Ver demostración' : 'Abrir video'}
            </span>
          </button>
        )}

        <button type="button" className="ex-session-card__detail-link" onClick={handleOpenDetail}>
          <FileText size={15} strokeWidth={1.75} />
          Técnica y notas
        </button>
      </div>

      {!readOnly && !isActive && !isCompleted && !isExpanded && (
        <button type="button" className="ex-session-card__expand" onClick={() => setIsExpanded(true)}>
          Registrar series
        </button>
      )}

      {!readOnly && (isActive || isCompleted || isExpanded) && (
        <div className="ex-session-card__logger">
          <WeightLogger
            targetKg={exercise.pesoObjetivo}
            lastKg={exercise.pesoRegistrado}
            setsTotal={exercise.series}
            setsCompleted={exercise.setsCompletados}
            onSetComplete={kg => onSetComplete(exercise.id, kg)}
            disabled={isPreview}
          />
        </div>
      )}
    </article>
  )
}
