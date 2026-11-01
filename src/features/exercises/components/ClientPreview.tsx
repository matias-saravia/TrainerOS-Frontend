import { useState } from 'react'
import type { Exercise } from '../api/exercises.api'
import './ClientPreview.css'

interface ClientPreviewProps {
  exercise: Partial<Exercise> & { nombre?: string }
}

export default function ClientPreview({ exercise }: ClientPreviewProps) {
  const [videoError, setVideoError] = useState(false)
  const hasVideo = exercise.videoUrl && !videoError

  // Extract YouTube embed URL
  const getEmbedUrl = (url: string): string | null => {
    try {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
      if (match) return `https://www.youtube.com/embed/${match[1]}`
      return null
    } catch {
      return null
    }
  }

  const embedUrl = exercise.videoUrl ? getEmbedUrl(exercise.videoUrl) : null

  return (
    <aside className="client-preview">
      <span className="client-preview__label">Lo que ve el alumno</span>

      <div className="client-preview__card">
        {/* Header */}
        <div className="client-preview__card-header">
          <div>
            <h3 className="client-preview__exercise-name">
              {exercise.nombre || 'Nombre del Ejercicio'}
            </h3>
            <div className="client-preview__meta">
              {exercise.duracionEstimada && (
                <span className="client-preview__meta-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {exercise.duracionEstimada}s
                </span>
              )}
              {exercise.series && (
                <span className="client-preview__meta-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                  {exercise.series} Series
                </span>
              )}
            </div>
          </div>
          {exercise.grupoMuscular && (
            <span className="chip chip--navy">{exercise.grupoMuscular}</span>
          )}
        </div>

        {/* Video / Placeholder */}
        <div className="client-preview__media">
          {embedUrl && !videoError ? (
            <iframe
              src={embedUrl}
              title="Exercise video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              allowFullScreen
              onError={() => setVideoError(true)}
            />
          ) : hasVideo ? (
            <div className="client-preview__media-placeholder">
              <div className="client-preview__play-btn">▶</div>
            </div>
          ) : (
            <div className="client-preview__media-placeholder client-preview__media-placeholder--empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
                <line x1="7" y1="2" x2="7" y2="22"/>
                <line x1="17" y1="2" x2="17" y2="22"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <line x1="2" y1="7" x2="7" y2="7"/>
                <line x1="2" y1="17" x2="7" y2="17"/>
                <line x1="17" y1="17" x2="22" y2="17"/>
                <line x1="17" y1="7" x2="22" y2="7"/>
              </svg>
              <span>Sin video</span>
            </div>
          )}
        </div>

        {/* Instructions */}
        {(exercise.instrucciones?.length ?? 0) > 0 && (
          <div className="client-preview__instructions">
            <span className="client-preview__instructions-label">Técnica</span>
            <ol className="client-preview__instructions-list">
              {exercise.instrucciones?.map((inst, i) => (
                <li key={i}>{inst}</li>
              ))}
            </ol>
          </div>
        )}

        {(exercise.instrucciones?.length ?? 0) === 0 && (
          <div className="client-preview__instructions">
            <span className="client-preview__instructions-label">Técnica</span>
            <p className="client-preview__instructions-empty">
              Acá aparece la técnica a medida que la escribís.
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
