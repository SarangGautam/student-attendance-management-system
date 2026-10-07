import { BookOpenCheck, GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function AuthLayout({ children, eyebrow, title, description }) {
  const { databaseMessage } = useAuth()
  return (
    <main className="auth-background flex min-h-screen items-center justify-center px-4 py-8 text-ink sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_64px_-42px_rgba(15,23,42,.4)] lg:min-h-[620px] lg:grid-cols-[.88fr_1.12fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-[#111d33] p-10 text-white lg:flex">
          <div className="absolute -right-32 top-16 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
          <Link to="/login" className="relative flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500 text-white"><BookOpenCheck size={20} /></span>
            <span><span className="block text-sm font-bold tracking-[.16em]">CAMPUS</span><span className="mt-0.5 block text-xs text-white/60">Attendance workspace</span></span>
          </Link>
          <div className="relative max-w-sm pb-6">
            <span className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-blue-200"><GraduationCap size={15} /> Education operations</span>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight">A clearer view of every school day.</h2>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/60">A focused workspace for attendance, student records, and school reporting.</p>
          </div>
          <p className="relative text-xs text-white/45">Student Attendance Management System</p>
        </section>

        <section className="flex items-center justify-center px-6 py-9 sm:px-12 lg:px-14">
          <div className="w-full max-w-md">
            <Link to="/login" className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-600 text-white"><BookOpenCheck size={19} /></span>
              <span><span className="block text-sm font-bold tracking-[.14em]">CAMPUS</span><span className="text-xs text-slate-500">Attendance workspace</span></span>
            </Link>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-teal">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            {databaseMessage && <div role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm leading-5 text-amber-900">{databaseMessage}</div>}
            <div className="mt-8">{children}</div>
          </div>
        </section>
      </div>
    </main>
  )
}
