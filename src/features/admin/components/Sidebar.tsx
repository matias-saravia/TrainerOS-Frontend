import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  CreditCard,
  UserPlus,
  LogOut,
  Library,
} from 'lucide-react'
import { useAuth } from '../../auth'
import Logo from '../../../components/Logo'
import './Sidebar.css'

const navItems = [
  { to: '/admin/dashboard',                 icon: LayoutDashboard, label: 'Panel',      end: false },
  { to: '/admin/clientes',                  icon: Users,           label: 'Alumnos',    end: false },
  { to: '/admin/entrenamientos',            icon: Dumbbell,        label: 'Rutinas',    end: true },
  { to: '/admin/entrenamientos/ejercicios', icon: Library,         label: 'Ejercicios', end: false },
  { to: '/admin/finanzas',                  icon: CreditCard,      label: 'Finanzas',   end: false },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { signOut, profile, user } = useAuth()

  const displayName = profile?.nombre
    ? `${profile.nombre} ${profile.apellido || ''}`.trim()
    : user?.email ?? ''

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Error logging out:', err)
      navigate('/login')
    }
  }

  return (
    <>
      {/* ── Desktop rail ──────────────────────────────── */}
      <aside className="admin-rail">
        <Logo />

        <nav className="admin-rail__nav" aria-label="Principal">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `admin-rail__item${isActive ? ' admin-rail__item--active' : ''}`
              }
            >
              <Icon size={18} strokeWidth={1.5} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="admin-rail__cta" onClick={() => navigate('/admin/clientes/nuevo')}>
          <UserPlus size={16} strokeWidth={1.75} />
          Nuevo alumno
        </button>

        <div className="admin-rail__footer">
          {displayName && <p className="admin-rail__user">{displayName}</p>}
          <button className="admin-rail__logout" onClick={handleLogout}>
            <LogOut size={16} strokeWidth={1.5} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom navigation ──────────────────── */}
      <nav className="bottom-nav" aria-label="Principal">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
            }
          >
            <Icon size={22} strokeWidth={1.5} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
