import { Construction } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const titles = {
  '/classes': 'Classes & Sections', '/students': 'Students', '/attendance': 'Take Attendance',
  '/calendar': 'Calendar', '/reports': 'Attendance Reports', '/settings': 'Settings',
}

export default function ComingSoonPage() {
  const { pathname } = useLocation()
  return <section className="grid min-h-[55vh] place-items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 text-center"><div className="max-w-md"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal/10 text-teal"><Construction size={26} /></span><h2 className="mt-5 text-2xl font-extrabold">{titles[pathname] || 'Coming soon'}</h2><p className="mt-2 leading-6 text-slate-500">This area will be available in a future step. Your teacher account is ready to go.</p><span className="mt-5 inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">Coming soon</span></div></section>
}
