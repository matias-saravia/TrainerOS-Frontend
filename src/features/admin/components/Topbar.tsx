import { UserCircle } from 'lucide-react'
import { useAuth } from '../../auth'
import './Topbar.css'

interface TopbarProps {
  title?: string
}

export default function Topbar({ title }: TopbarProps) {
  const { profile, user } = useAuth()

  const displayName = profile?.nombre
    ? `${profile.nombre} ${profile.apellido || ''}`.trim()
    : user?.email?.split('@')[0] || 'Entrenador'

  return (
    <header className="topbar">
      {title && <h1 className="topbar__title">{title}</h1>}
      <div className="topbar__actions">
        <div className="topbar__avatar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCircle size={28} strokeWidth={1.5} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-blue)' }}>
            {displayName}
          </span>
        </div>
      </div>
    </header>
  )
}
