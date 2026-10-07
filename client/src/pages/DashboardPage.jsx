import { BookOpen, CalendarCheck2, CircleUserRound, ClipboardCheck, UsersRound, Layers3, Gift, ArrowUpRight, UserPlus, GraduationCap, ChartNoAxesCombined, CalendarRange, LoaderCircle, RotateCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const metricCards = [
  { label: 'Total Students', key: 'students', icon: UsersRound, tone: 'blue' },
  { label: 'Total Classes', key: 'classes', icon: BookOpen, tone: 'slate' },
  { label: 'Total Sections', key: 'sections', icon: Layers3, tone: 'slate' },
  { label: 'Present Today', key: 'present', icon: CalendarCheck2, tone: 'green' },
  { label: 'Absent Today', key: 'absent', icon: ClipboardCheck, tone: 'red' },
]

const toneStyles = {
  blue: 'bg-blue-50 text-blue-700', slate: 'bg-slate-100 text-slate-600', green: 'bg-emerald-50 text-emerald-700', red: 'bg-rose-50 text-rose-700',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const [counts, setCounts] = useState({ classes: 0, sections: 0, students: 0, present: null, absent: null, attendanceMarked: false })
  const [countsLoading, setCountsLoading] = useState(true)
  const [countsError, setCountsError] = useState('')
  const [upcomingHolidays, setUpcomingHolidays] = useState(null)
  const [holidaysError, setHolidaysError] = useState('')
  const [activeYear, setActiveYear] = useState(null)
  useEffect(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    Promise.all([apiRequest('/api/classes'), apiRequest('/api/students?status=active&limit=25&page=1'), apiRequest(`/api/attendance/today-summary?date=${today}`)])
      .then(([classResult, studentResult, attendanceResult]) => setCounts({ classes: classResult.data.length, sections: classResult.data.reduce((total, item) => total + item.sectionCount, 0), students: studentResult.data.total, present: attendanceResult.data.present, absent: attendanceResult.data.absent, attendanceMarked: attendanceResult.data.marked }))
      .catch(() => setCountsError('Unable to load dashboard statistics. Please refresh the page.'))
      .finally(() => setCountsLoading(false))
  }, [])
  useEffect(() => {
    apiRequest('/api/holidays?upcoming=true&limit=3').then(({ data }) => setUpcomingHolidays(data)).catch(() => setHolidaysError('Unable to load upcoming holidays.'))
  }, [])
  useEffect(() => {
    const refreshYear = () => apiRequest('/api/academic-years').then(({ data }) => setActiveYear(data.find((year) => year.isActive) || null)).catch(() => {})
    refreshYear()
    window.addEventListener('academic-year-updated', refreshYear)
    return () => window.removeEventListener('academic-year-updated', refreshYear)
  }, [])
  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[.12em] text-blue-700">Overview</p><h2 className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-[30px]">{greeting}, {user?.name}</h2><p className="mt-1.5 text-sm text-slate-500">Here's your attendance overview.</p></div>
        <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"><CalendarRange size={15} className="text-slate-400" />Academic year <span className="font-semibold text-slate-800">{activeYear?.name || 'Not set'}</span></div>
      </div>

      <section aria-label="Attendance summary" className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-5">
        {metricCards.map(({ label, key, icon: Icon, tone }) => <article key={label} className="premium-card rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><p className="text-[13px] font-medium text-slate-500">{label}</p><span className={`grid h-8 w-8 place-items-center rounded-lg ${toneStyles[tone]}`}><Icon size={16} /></span></div><p className={`${key === 'present' || key === 'absent' ? 'text-lg' : 'text-2xl'} mt-3 font-bold tracking-tight text-slate-900`} aria-live="polite">{countsLoading ? <LoaderCircle size={20} className="animate-spin text-slate-400" /> : countsError ? '—' : (key === 'present' || key === 'absent') && !counts.attendanceMarked ? 'Not Marked' : (counts[key] ?? 0)}</p><p className="mt-1 text-[11px] text-slate-400">{countsLoading ? 'Loading overview' : countsError ? 'Statistics unavailable' : key === 'classes' || key === 'sections' ? 'In your workspace' : key === 'students' ? 'Active records' : counts.attendanceMarked ? 'Today’s recorded total' : 'No record for today'}</p></article>)}
      </section>
      {countsError && <div role="alert" className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{countsError}</span><button aria-label="Retry dashboard statistics" onClick={() => window.location.reload()} className="grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-rose-100"><RotateCw size={15}/></button></div>}

      <section className="mt-6"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-slate-900">Quick actions</h3><p className="mt-0.5 text-xs text-slate-500">Common tasks for your classroom</p></div></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{[[ClipboardCheck,'Take Attendance','/attendance'],[UserPlus,'Add Student','/students'],[GraduationCap,'Manage Classes','/classes'],[ChartNoAxesCombined,'View Reports','/reports']].map(([Icon,label,to])=><Link key={to} to={to} className="premium-card group flex min-h-[58px] items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 shadow-sm hover:border-blue-200"><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700"><Icon size={16}/></span><span className="min-w-0 flex-1 text-[13px] font-semibold text-slate-700">{label}</span><ArrowUpRight size={15} className="text-slate-300 group-hover:text-blue-600"/></Link>)}</div></section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <article className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-700"><Gift size={17} /></span><div><h3 className="text-sm font-semibold text-slate-900">Upcoming holidays</h3><p className="mt-0.5 text-xs text-slate-500">Your next school dates</p></div></div><Link to="/calendar" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800">Calendar<ArrowUpRight size={13}/></Link></div>
          {holidaysError ? <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{holidaysError}</p> : upcomingHolidays === null ? <p role="status" className="mt-5 rounded-xl bg-paper p-4 text-sm text-slate-500">Loading upcoming holidays…</p> : upcomingHolidays.length ? <ul className="mt-5 divide-y divide-slate-100">{upcomingHolidays.map((holiday) => <li key={holiday._id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm font-semibold text-slate-800">{new Date(`${holiday.date.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' })} — {holiday.name}</span><span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{holiday.type}</span></li>)}</ul> : <p className="mt-5 rounded-xl bg-paper p-4 text-sm text-slate-500">No upcoming holidays.</p>}
        </article>
        <article className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><CircleUserRound size={18} /></span><div><h3 className="text-sm font-semibold text-slate-900">Teacher account</h3><p className="mt-0.5 text-xs text-slate-500">Your sign-in details</p></div></div>
          <dl className="mt-6 space-y-4"><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</dt><dd className="mt-1 text-sm font-semibold text-slate-700">{user?.name}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</dt><dd className="mt-1 break-all text-sm font-semibold text-slate-700">{user?.email}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Role</dt><dd className="mt-1 inline-flex rounded-full bg-teal/10 px-2.5 py-1 text-xs font-bold capitalize text-teal">{user?.role}</dd></div></dl>
        </article>
      </section>
    </div>
  )
}
