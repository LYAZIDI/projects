import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Search, Zap, Bell, Target } from 'lucide-react'
import { useNotifications } from '../context/NotificationsContext'
import { useCV } from '../context/CVContext'

export default function Navbar() {
  const { pathname } = useLocation()
  const { unreadCount } = useNotifications()
  const { cv } = useCV()

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/jobs', label: 'Offres', icon: Search },
    { to: '/ats-optimizer', label: 'ATS', icon: Target },
  ]

  const initials = cv?.name
    ? cv.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-primary shrink-0">
          <Zap size={20} className="text-primary" />
          JobCopilot
        </Link>

        <div className="flex items-center gap-1 flex-1">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith(l.to)
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <l.icon size={15} />
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <Link
            to="/notifications"
            className={`relative p-2 rounded-lg transition-colors ${
              pathname === '/notifications' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Avatar */}
          <Link to="/onboarding" title="Changer de CV">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-primary/80 transition-colors">
              {initials}
            </div>
          </Link>
        </div>
      </div>
    </nav>
  )
}
