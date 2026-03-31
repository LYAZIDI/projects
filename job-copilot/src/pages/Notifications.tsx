import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useNotifications } from '../context/NotificationsContext'
import {
  Bell, Briefcase, Star, Clock, Calendar, Lightbulb,
  CheckCheck, Trash2, ExternalLink, ArrowLeft
} from 'lucide-react'

const TYPE_CONFIG = {
  new_job:    { icon: Briefcase, color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'Nouveau job' },
  high_match: { icon: Star,      color: 'text-green-600',  bg: 'bg-green-50',  label: 'Match élevé' },
  follow_up:  { icon: Clock,     color: 'text-amber-600',  bg: 'bg-amber-50',  label: 'Relance' },
  interview:  { icon: Calendar,  color: 'text-purple-600', bg: 'bg-purple-50', label: 'Entretien' },
  ats_tip:    { icon: Lightbulb, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Conseil ATS' },
} as const

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'À l\'instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  return `il y a ${Math.floor(hours / 24)} jour${Math.floor(hours / 24) > 1 ? 's' : ''}`
}

export default function Notifications() {
  const { notifications, unreadCount, markRead, markAllRead, remove } = useNotifications()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Bell size={20} className="text-primary" />
              Notifications
              {unreadCount > 0 && (
                <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <CheckCheck size={14} /> Tout marquer lu
            </button>
          )}
        </div>

        {/* Empty state */}
        {notifications.length === 0 && (
          <div className="card p-12 text-center">
            <Bell size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">Aucune notification</p>
            <p className="text-gray-400 text-sm mt-1">
              Les nouvelles offres, matches et rappels apparaîtront ici.
            </p>
          </div>
        )}

        {/* Notification list */}
        <div className="space-y-2">
          {notifications.map(notif => {
            const cfg = TYPE_CONFIG[notif.type]
            const Icon = cfg.icon
            return (
              <div
                key={notif.id}
                className={`card p-4 flex items-start gap-3 transition-all ${!notif.read ? 'border-primary/30 bg-primary/5' : ''}`}
              >
                <div className={`w-9 h-9 ${cfg.bg} rounded-lg flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon size={16} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`text-xs font-semibold ${cfg.color} uppercase tracking-wide`}>
                        {cfg.label}
                      </span>
                      <p className={`text-sm font-medium mt-0.5 ${!notif.read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.body}</p>
                    </div>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">{timeAgo(notif.createdAt)}</span>
                    {notif.link && (
                      <button
                        onClick={() => { markRead(notif.id); navigate(notif.link!) }}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        Voir <ExternalLink size={10} />
                      </button>
                    )}
                    {!notif.read && (
                      <button onClick={() => markRead(notif.id)} className="text-xs text-gray-400 hover:text-gray-600">
                        Marquer lu
                      </button>
                    )}
                    <button
                      onClick={() => remove(notif.id)}
                      className="text-xs text-gray-300 hover:text-red-400 ml-auto"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
