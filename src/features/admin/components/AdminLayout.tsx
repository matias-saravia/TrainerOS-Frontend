import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../auth'
import Logo from '../../../components/Logo'
import Sidebar from './Sidebar'
import './AdminLayout.css'
import './MobileTopbar.css'

function MobileTopbar() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Error logging out:', err)
    }
    navigate('/login')
  }

  return (
    <header className="mobile-topbar">
      <Logo size={24} />
      <button className="mobile-topbar__logout" onClick={handleLogout} aria-label="Cerrar sesión">
        <LogOut size={20} strokeWidth={1.5} />
      </button>
    </header>
  )
}

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-layout__main">
        <MobileTopbar />
        <Outlet />
      </div>
    </div>
  )
}
