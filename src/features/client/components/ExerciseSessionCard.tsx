import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, X, ExternalLink, FileText, VideoOff } from 'lucide-react'
import type { SessionExercise } from '../api/client.api'
import WeightLogger from './WeightLogger'
import { parseVideoUrl } from '../../../utils/video'
import './ExerciseSessionCard.css'

interface ExerciseSessionCardProps {
  exercise: SessionExercise
  index: number
  onSetComplete: (exerciseId: string, kg: number) => void
  sesionId: string
  readOnly?: boolean
}

export default function ExerciseSessionCard({
  exercise,
  index,
  onSetComplete,
  sesionId,
  readOnly = false,
}: ExerciseSessionCardProps) {
  const navigate = useNavigate()
  const [isPlayingInline, setIsPlayingInline] = useState(false)
  const isCompleted = exercise.setsCompletados >= exercise.series

  const video = parseVideoUrl(exercise.videoUrl)
  const hasPlayableVideo = video.type === 'youtube' || video.type === 'vimeo' || video.type === 'direct'

  const handleOpenDetail = () => {
    navigate(`/alumno/sesion/${sesionId}/ejercicio/${exercise.id}`)
  }

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasPlayableVideo) {
      setIsPlayingInline(prev => !prev)
    } else if (video.type === 'unsupported' && video.rawUrl) {
      window.open(video.rawUrl, '_blank', 'noopener,noreferrer')
    } else {
      handleOpenDetail()
    }
  }

  return (
    <div
      className={`ex-session-card${isCompleted ? ' ex-session-card--done' : ''}`}
      id={`exercise-card-${exercise.id}`}
    >
      {/* ── Header: number + name + category chip ── */}
      <div className="ex-session-card__header">
        <div className="ex-session-card__numbering">
          <span className="ex-session-card__number">EJERCICIO {String(index + 1).padStart(2, '0')}</span>
          <h2 className="ex-session-card__name">{exercise.nombre}</h2>
          {exercise.grupoMuscular && (
            <span className="ex-session-card__muscle">{exercise.grupoMuscular}</span>
          )}
        </div>
        {exercise.categoria && (
          <span className={`ex-session-card__chip ex-session-card__chip--${exercise.categoria.toLowerCase()}`}>
            {exercise.categoria}
          </span>
        )}
      </div>

      {/* ── Media Area (Inline Video Player / Thumbnail / Placeholder) ── */}
      <div className="ex-session-card__media-container">
        {isPlayingInline && hasPlayableVideo ? (
          <div className="ex-session-card__player-wrapper">
            <button
              className="ex-session-card__close-video"
              onClick={() => setIsPlayingInline(false)}
              aria-label="Cerrar video"
              title="Cerrar video"
            >
              <X size={16} strokeWidth={2} />
              <span>Cerrar</span>
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
        ) : (
          <div
            className={`ex-session-card__media${hasPlayableVideo ? ' ex-session-card__media--has-video' : ''}`}
            onClick={handleTogglePlay}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleTogglePlay(e as unknown as React.MouseEvent)
              }
            }}
            aria-label={
              hasPlayableVideo
                ? `Reproducir video de ${exercise.nombre}`
                : `Ver notas de ${exercise.nombre}`
            }
          >
            {/* Real YouTube thumbnail if available */}
            {video.thumbnailUrl && (
              <img
                className="ex-session-card__video-thumb"
                src={video.thumbnailUrl}
                alt=""
                aria-hidden="true"
                loading="lazy"
              />
            )}

            {/* Overlay */}
            <div className="ex-session-card__media-inner">
              {hasPlayableVideo ? (
                <>
                  <div className="ex-session-card__play-circle" aria-hidden="true">
                    <Play size={20} fill="#ffffff" color="#ffffff" style={{ marginLeft: 3 }} />
                  </div>
                  <span className="ex-session-card__media-hint">
                    Reproducir demostración
                  </span>
                </>
              ) : video.type === 'unsupported' ? (
                <>
                  <div className="ex-session-card__play-circle" aria-hidden="true">
                    <ExternalLink size={18} color="#ffffff" />
                  </div>
                  <span className="ex-session-card__media-hint">
                    Abrir video en enlace externo
                  </span>
                </>
              ) : (
                <>
                  <div className="ex-session-card__placeholder-circle" aria-hidden="true">
                    <VideoOff size={18} color="rgba(82,103,125,0.7)" />
                  </div>
                  <span className="ex-session-card__media-hint">
                    Sin video demostrativo
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Action bar below media: quick link to full technique and notes */}
        <div className="ex-session-card__actions-bar">
          <button
            type="button"
            className="ex-session-card__detail-link"
            onClick={handleOpenDetail}
          >
            <FileText size={13} strokeWidth={1.75} />
            <span>Ver técnica completa y notas</span>
          </button>
        </div>
      </div>

      {/* ── Metrics: SERIES | REPS ── */}
      <div className="ex-session-card__metrics">
        <div className="ex-session-card__metric">
          <span className="ex-session-card__metric-label">SERIES</span>
          <span className="ex-session-card__metric-value">{exercise.series}</span>
        </div>
        <div className="ex-session-card__metric">
          <span className="ex-session-card__metric-label">REPS</span>
          <span className="ex-session-card__metric-value">{exercise.reps}</span>
        </div>
        {exercise.descanso > 0 && (
          <div className="ex-session-card__metric">
            <span className="ex-session-card__metric-label">DESCANSO</span>
            <span className="ex-session-card__metric-value">{exercise.descanso}s</span>
          </div>
        )}
      </div>

      {/* ── Weight Logger ── */}
      {!readOnly && (
        <div className="ex-session-card__logger">
          <div className="ex-session-card__logger-meta">
            <p className="ex-session-card__logger-label">Registro de Carga (kg)</p>
            {exercise.pesoObjetivo && (
              <span className="ex-session-card__logger-objective">
                Objetivo: {exercise.pesoObjetivo}kg
              </span>
            )}
          </div>
          <WeightLogger
            targetKg={exercise.pesoObjetivo}
            lastKg={exercise.pesoRegistrado}
            setsTotal={exercise.series}
            setsCompleted={exercise.setsCompletados}
            onSetComplete={kg => onSetComplete(exercise.id, kg)}
          />
        </div>
      )}
    </div>
  )
}
