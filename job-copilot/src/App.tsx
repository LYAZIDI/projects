import { Routes, Route, Navigate } from 'react-router-dom'
import { CVProvider } from './context/CVContext'
import { NotificationsProvider } from './context/NotificationsContext'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import ApplyPage from './pages/ApplyPage'
import Onboarding from './pages/Onboarding'
import Notifications from './pages/Notifications'
import ATSOptimizer from './pages/ATSOptimizer'

export default function App() {
  return (
    <CVProvider>
      <NotificationsProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/apply/:id" element={<ApplyPage />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/ats-optimizer" element={<ATSOptimizer />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </NotificationsProvider>
    </CVProvider>
  )
}
