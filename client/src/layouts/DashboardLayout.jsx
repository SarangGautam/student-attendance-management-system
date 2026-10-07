import { useEffect, useState } from 'react'
import { BookOpenCheck, CalendarDays, ChartNoAxesCombined, GraduationCap, LayoutDashboard, LogOut, Menu, Settings, UsersRound, UserRound, ClipboardCheck, X, CalendarRange, ChevronDown } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { apiRequest } from '../services/api.js'

const navigation = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Academic Years', path: '/academic-years', icon: CalendarRange },
  { label: 'Classes & Sections', path: '/classes', icon: GraduationCap },
  { label: 'Students', path: '/students', icon: UsersRound },
  { label: 'Take Attendance', path: '/attendance', icon: ClipboardCheck },
  { label: 'Calendar', path: '/calendar', icon: CalendarDays },
  { label: 'Attendance Reports', path: '/reports', icon: ChartNoAxesCombined },
]

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [activeYear, setActiveYear] = useState(null)

  useEffect(() => {
    const refreshYear = () => apiRequest('/api/academic-years').then(({ data }) => setActiveYear(data.find((year) => year.isActive) || null)).catch(() => {})
    refreshYear()
    window.addEventListener('academic-year-updated', refreshYear)
    return () => window.removeEventListener('academic-year-updated', refreshYear)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location.pathname])
  useEffect(() => {
    if (!menuOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown) }
  }, [menuOpen])

  async function handleLogout() {
    setLoggingOut(true)
    try { await logout() } finally { navigate('/login', { replace: true }) }
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-[#111d33] px-3.5 py-4 text-white">
      <div className="mb-7 flex items-center justify-between px-2.5">
        <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-500 text-white"><BookOpenCheck size={19} /></span><span className="min-w-0"><span className="block text-[13px] font-bold tracking-[.12em]">CAMPUS</span><span className="block truncate text-[11px] text-white/50">Attendance workspace</span></span></div>
        <button type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white md:hidden"><X size={19} /></button>
      </div>
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.14em] text-white/35">Workspace</p>
      <nav aria-label="Main navigation" className="space-y-1">
        {navigation.map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} className={({ isActive }) => `group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition ${isActive ? 'bg-white/10 text-white before:absolute before:inset-y-2 before:-left-3.5 before:w-[3px] before:rounded-r before:bg-blue-400' : 'text-white/60 hover:bg-white/[.06] hover:text-white'}`}><Icon size={17} strokeWidth={1.9} /><span>{label}</span></NavLink>)}
      </nav>
      <div className="mt-5 rounded-lg border border-white/[.08] bg-white/[.035] p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Active academic year</p><div className="mt-1.5 flex items-center justify-between gap-2"><p className="truncate text-[13px] font-semibold text-white">{activeYear?.name || 'Not set'}</p><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${activeYear ? 'bg-emerald-400' : 'bg-slate-500'}`} /></div><NavLink to="/academic-years" className="mt-2 inline-block text-xs font-medium text-blue-300 hover:text-blue-200">Manage years</NavLink></div>
      <div className="mt-auto border-t border-white/10 pt-3">
        <NavLink to="/settings" className={({ isActive }) => `mb-2 flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/[.06] hover:text-white'}`}><Settings size={17} />Settings</NavLink>
        <div className="mb-2 flex items-center gap-2.5 rounded-lg px-2.5 py-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-200">{(user?.name || 'T').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-xs font-semibold text-white/90">{user?.name}</span><span className="block truncate text-[11px] text-white/45">{user?.email}</span></span></div>
        <button type="button" onClick={handleLogout} disabled={loggingOut} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-white/55 hover:bg-rose-400/10 hover:text-rose-200 disabled:opacity-50"><LogOut size={17} />{loggingOut ? 'Logging out…' : 'Log out'}</button>
      </div>
    </div>
  )

  const current = [...navigation, { label: 'Settings', path: '/settings' }].find((item) => item.path === location.pathname)
  const initials = (user?.name || 'Teacher').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] md:block">{sidebar}</aside>
      {menuOpen && <div className="fixed inset-0 z-40 md:hidden"><button aria-label="Close navigation overlay" className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" onClick={() => setMenuOpen(false)} /><aside className="absolute inset-y-0 left-0 w-[min(18rem,88vw)] animate-[drawer-in_.18s_ease-out] shadow-2xl">{sidebar}</aside></div>}
      <div className="min-h-screen md:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[62px] items-center justify-between border-b border-slate-200 bg-white/95 px-3.5 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3"><button type="button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden"><Menu size={18} /></button><div className="min-w-0"><p className="hidden text-[10px] font-medium uppercase tracking-[.1em] text-slate-400 sm:block">Teacher workspace</p><h1 className="truncate text-sm font-semibold text-slate-800">{current?.label || 'Dashboard'}</h1></div></div>
          <div className="flex shrink-0 items-center gap-2.5"><div className="hidden items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 sm:flex"><CalendarRange size={14} className="text-slate-400" />{activeYear?.name || 'Academic year not set'}<ChevronDown size={13} className="text-slate-400" /></div><span className="hidden max-w-36 truncate text-xs font-medium text-slate-600 lg:block">{user?.name}</span><span aria-label={`Signed in as ${user?.name || 'teacher'}`} className="grid h-8 w-8 place-items-center rounded-full bg-[#e9efff] text-[11px] font-bold text-blue-700">{initials}</span></div>
        </header>
        <main className="mx-auto min-h-[calc(100vh-62px)] max-w-[1440px] p-4 sm:p-6 lg:p-8"><div key={location.pathname} className="page-enter"><Outlet /></div></main>
      </div>
      <style>{'@keyframes drawer-in { from { transform: translateX(-12px); opacity: .7 } to { transform: translateX(0); opacity: 1 } }'}</style>
    </div>
  )
}
