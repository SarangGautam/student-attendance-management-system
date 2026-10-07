import { Navigate, Route, Routes } from 'react-router-dom'
import { PublicOnly, RequireAuth } from './components/RouteGuards.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ClassesPage from './pages/ClassesPage.jsx'
import StudentsPage from './pages/StudentsPage.jsx'
import AttendancePage from './pages/AttendancePage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import AcademicYearsPage from './pages/AcademicYearsPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/academic-years" element={<AcademicYearsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
