import { useEffect, useMemo, useState } from 'react'
import { BarChart3, ChevronLeft, ChevronRight, Download, FileText, LoaderCircle, X } from 'lucide-react'
import { apiRequest } from '../services/api.js'
import { downloadMonthlyWorkbook } from '../services/monthlyReportExport.js'
import { downloadMonthlyReportPdf } from '../services/monthlyReportPdf.js'

const input = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15'
const months = Array.from({ length: 12 }, (_, index) => new Date(Date.UTC(2020, index, 1)).toLocaleDateString('en-IN', { month: 'long', timeZone: 'UTC' }))
const today = new Date()
const pad = (value) => String(value).padStart(2, '0')
const isoFor = (year, month, day) => `${year}-${pad(month)}-${pad(day)}`
const formatDay = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' })
const symbols = { present: 'P', absent: 'A', holiday: 'H', notMarked: '—' }
const symbolStyles = { present: 'bg-emerald-50 text-emerald-700', absent: 'bg-rose-50 text-rose-700', holiday: 'bg-amber-50 text-amber-800', notMarked: 'text-slate-400' }

export default function ReportsPage() {
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())
  const [report, setReport] = useState(null)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState('')
  const [exportError, setExportError] = useState('')
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [pdfMessage, setPdfMessage] = useState('')
  const [pdfError, setPdfError] = useState('')
  const [reportSettings, setReportSettings] = useState({})

  useEffect(() => { apiRequest('/api/classes').then(({ data }) => setClasses(data)).catch((err) => setError(err.message)) }, [])
  useEffect(() => { apiRequest('/api/settings').then(({ data }) => setReportSettings(data)).catch(() => setReportSettings({})) }, [])
  useEffect(() => {
    setSections([]); setSectionId(''); setReport(null); setGenerated(false); setExportMessage(''); setPdfMessage(''); setPdfError('')
    if (classId) apiRequest(`/api/sections?classId=${encodeURIComponent(classId)}`).then(({ data }) => setSections(data)).catch((err) => setError(err.message))
  }, [classId])

  async function generate(next = {}) {
    const targetSection = next.sectionId ?? sectionId
    const targetMonth = next.month ?? month
    const targetYear = next.year ?? year
    setGenerated(true); setError(''); setExportMessage(''); setExportError(''); setPdfMessage(''); setPdfError('')
    if (!classId) { setReport(null); return }
    if (!targetSection) { setReport(null); return }
    setLoading(true)
    try {
      const { data } = await apiRequest(`/api/attendance/monthly?sectionId=${encodeURIComponent(targetSection)}&month=${targetMonth}&year=${targetYear}`)
      setReport(data)
    } catch (err) { setReport(null); setError(err.message) }
    finally { setLoading(false) }
  }

  async function exportReport() {
    if (!report || exporting) return
    setExporting(true); setExportMessage(''); setExportError('')
    try {
      await downloadMonthlyWorkbook(report, reportSettings)
      setExportMessage('Excel report downloaded successfully.')
    } catch {
      setExportError('Unable to generate the Excel report. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  async function exportPdfReport() {
    if (!report || !report.students.length || pdfGenerating) return
    setPdfGenerating(true); setPdfMessage(''); setPdfError('')
    try {
      await downloadMonthlyReportPdf(report, reportSettings)
      setPdfMessage('PDF report downloaded successfully.')
    } catch {
      setPdfError('Unable to generate the PDF report. Please try again.')
    } finally {
      setPdfGenerating(false)
    }
  }

  function navigateMonth(offset) {
    const date = new Date(Date.UTC(year, month - 1 + offset, 1))
    const nextMonth = date.getUTCMonth() + 1
    const nextYear = date.getUTCFullYear()
    setMonth(nextMonth); setYear(nextYear)
    if (sectionId) generate({ month: nextMonth, year: nextYear })
  }

  const totalDays = report?.period.daysInMonth || new Date(Date.UTC(year, month, 0)).getUTCDate()
  const monthName = useMemo(() => months[month - 1], [month])

  return <div className="min-w-0">
    <div className="mb-6 flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal/10 text-teal"><BarChart3 size={23} /></span><div><p className="text-sm font-semibold text-teal">Review student attendance</p><h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Monthly Attendance Report</h2><p className="mt-1 text-sm text-slate-500">Recorded attendance, holidays, and unmarked school days.</p></div></div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
    <section className="mb-5 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-[1.15fr_1fr_1fr_.8fr_auto] xl:items-end">
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Class<select className={`${input} mt-1.5 text-base normal-case`} value={classId} onChange={(e) => setClassId(e.target.value)}><option value="">Select Class</option>{classes.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Section<select className={`${input} mt-1.5 text-base normal-case`} value={sectionId} disabled={!classId} onChange={(e) => { setSectionId(e.target.value); setReport(null); setGenerated(false); setExportMessage(''); setPdfMessage(''); setPdfError('') }}><option value="">Select Section</option>{sections.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Month<select className={`${input} mt-1.5 text-base normal-case`} value={month} onChange={(e) => { setMonth(Number(e.target.value)); setReport(null); setGenerated(false); setExportMessage(''); setPdfMessage(''); setPdfError('') }}>{months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Year<select className={`${input} mt-1.5 text-base normal-case`} value={year} onChange={(e) => { setYear(Number(e.target.value)); setReport(null); setGenerated(false); setExportMessage(''); setPdfMessage(''); setPdfError('') }}>{Array.from({ length: 11 }, (_, i) => today.getFullYear() - 5 + i).map((item) => <option key={item}>{item}</option>)}</select></label>
      <button onClick={() => generate()} disabled={loading} className="min-h-11 rounded-xl bg-teal px-4 text-sm font-bold text-white shadow-sm hover:bg-teal/90 disabled:opacity-60">{loading ? 'Generating…' : 'Generate Report'}</button>
    </section>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex max-w-full flex-wrap items-center gap-2"><button aria-label="Previous month" onClick={() => navigateMonth(-1)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600"><ChevronLeft size={18} /></button><span className="min-w-0 flex-1 px-1 text-center text-sm font-bold sm:min-w-36 sm:flex-none sm:px-0">{monthName} {year}</span><button aria-label="Next month" onClick={() => navigateMonth(1)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600"><ChevronRight size={18} /></button><button onClick={() => { setMonth(today.getMonth() + 1); setYear(today.getFullYear()); if (sectionId) generate({ month: today.getMonth() + 1, year: today.getFullYear() }) }} className="min-h-10 rounded-xl border border-teal/20 bg-teal/5 px-3 text-sm font-bold text-teal">Current Month</button></div>
      <div aria-label="Attendance legend" className="flex flex-wrap gap-2 text-xs font-semibold"><Legend symbol="P" label="Present" tone="emerald"/><Legend symbol="A" label="Absent" tone="rose"/><Legend symbol="H" label="Holiday" tone="amber"/><Legend symbol="—" label="Not Marked" tone="slate"/></div>
    </div>
    {!generated && <Empty>{!classId ? 'Select a class to generate the report.' : !sectionId ? 'Select a section to generate the report.' : 'Choose a month and year, then generate the report.'}</Empty>}
    {generated && !sectionId && <Empty>Select a section to generate the report.</Empty>}
    {loading && <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-500">Preparing monthly report…</div>}
    {report && !loading && <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{[
        ['Total Students', report.summary.totalStudents], ['Working Days', report.summary.workingDays], ['Holidays', report.summary.holidays], ['Attendance Records', report.summary.attendanceRecords], ['Average Attendance', report.summary.averageAttendance == null ? '—' : `${report.summary.averageAttendance}%`], ['Not Marked Days', report.summary.notMarkedDays],
      ].map(([label, value]) => <article key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-xl font-extrabold text-ink">{value}</p></article>)}</div>
      {!report.students.length && <Empty>No students found in this section.</Empty>}
      {report.summary.attendanceRecords === 0 && <div className="mb-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">No attendance has been recorded for this period.</div>}
      {report.students.length > 0 && <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center"><div><h3 className="font-extrabold">{report.section.className} · Section {report.section.name}</h3><p className="mt-0.5 text-xs text-slate-500">{monthName} {year} · {report.students.length} roster and historical records</p></div><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500"><FileText size={14}/> Monthly summary</span><button type="button" onClick={exportReport} disabled={exporting || !report} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal px-4 text-sm font-bold text-white shadow-sm hover:bg-teal/90 disabled:cursor-wait disabled:opacity-60 sm:w-auto">{exporting ? <><LoaderCircle size={17} className="animate-spin"/>Generating Excel...</> : <><Download size={17}/>Download Excel</>}</button><button type="button" onClick={exportPdfReport} disabled={pdfGenerating || !report?.students.length} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-ink bg-ink px-4 text-sm font-bold text-white shadow-sm hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60 sm:w-auto">{pdfGenerating ? <><LoaderCircle size={17} className="animate-spin"/>Generating PDF...</> : <><Download size={17}/>Download PDF</>}</button></div></div>
        {(exportMessage || exportError) && <div role={exportError ? 'alert' : 'status'} className={`mx-4 mt-3 rounded-xl px-3.5 py-2.5 text-sm ${exportError ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{exportError || exportMessage}</div>}
        {(pdfMessage || pdfError) && <div role={pdfError ? 'alert' : 'status'} className={`mx-4 mt-3 rounded-xl px-3.5 py-2.5 text-sm ${pdfError ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{pdfError || pdfMessage}</div>}
        <div className="max-w-full overflow-auto"><table className="w-full min-w-max border-collapse text-left text-xs"><thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="sticky left-0 z-20 min-w-20 border-b border-r border-slate-100 bg-slate-50 px-3 py-3">Roll No.</th><th className="sticky left-20 z-20 min-w-44 border-b border-r border-slate-100 bg-slate-50 px-3 py-3">Student Name</th>{Array.from({ length: totalDays }, (_, i) => <th key={i} className="min-w-9 border-b border-slate-100 px-2 py-3 text-center">{i + 1}</th>)}{['Present','Absent','Not Marked','Working Days','Attendance %'].map((label) => <th key={label} className="min-w-20 border-b border-l border-slate-100 bg-slate-50 px-3 py-3 text-center">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{report.students.map((student) => <tr key={student.studentId} className="hover:bg-teal/[.025]"><th scope="row" className="sticky left-0 z-[1] border-r border-slate-100 bg-white px-3 py-3 text-left font-bold text-slate-700">{student.rollNumber}</th><td className="sticky left-20 z-[1] border-r border-slate-100 bg-white px-3 py-3"><button onClick={() => setSelected(student)} className="text-left font-bold text-teal hover:underline">{student.name}{!student.active && <span className="ml-1.5 text-[10px] font-medium text-slate-400">Historical</span>}</button>{student.studentCode && <span className="mt-0.5 block text-[10px] text-slate-400">{student.studentCode}</span>}</td>{Array.from({ length: totalDays }, (_, i) => { const iso = isoFor(year, month, i + 1); const status = student.attendance[iso] || 'notMarked'; return <td key={iso} title={`${formatDay(iso)} · ${status}`} className="px-1 py-2 text-center"><span className={`inline-grid h-6 w-6 place-items-center rounded-md font-bold ${symbolStyles[status]}`}>{symbols[status]}</span></td> })}{[[student.summary.present,'text-emerald-700'],[student.summary.absent,'text-rose-700'],[student.summary.notMarked,'text-slate-500'],[student.summary.workingDays,'text-slate-700'],[student.summary.attendancePercentage == null ? '—' : `${student.summary.attendancePercentage}%`,'text-ink']].map(([value, style], i) => <td key={i} className={`border-l border-slate-100 px-3 py-3 text-center font-bold ${style}`}>{value}</td>)}</tr>)}</tbody></table></div>
        <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Attendance % uses recorded present and absent days only. Future dates and holidays are excluded from working days.</div>
      </section>}
      {report.students.length > 0 && <section className="mt-5 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"><div className="border-b border-slate-100 px-4 py-4"><h3 className="font-extrabold">Student Summary</h3></div><div className="max-w-full overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Student','Present','Absent','Not Marked','Attendance %'].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{report.students.map((student) => <tr key={student.studentId}><td className="px-4 py-3"><button onClick={() => setSelected(student)} className="font-semibold text-teal hover:underline">{student.name} · {student.rollNumber}</button></td><td className="px-4 py-3">{student.summary.present}</td><td className="px-4 py-3">{student.summary.absent}</td><td className="px-4 py-3">{student.summary.notMarked}</td><td className="px-4 py-3 font-bold">{student.summary.attendancePercentage == null ? '—' : `${student.summary.attendancePercentage}%`}</td></tr>)}</tbody></table></div></section>}
    </>}
    {selected && <StudentDetail student={selected} report={report} monthName={monthName} year={year} onClose={() => setSelected(null)} />}
  </div>
}

function Legend({ symbol, label, tone }) { const styles = { emerald: 'bg-emerald-50 text-emerald-700', rose: 'bg-rose-50 text-rose-700', amber: 'bg-amber-50 text-amber-800', slate: 'bg-slate-100 text-slate-500' }; return <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1"><span className={`grid h-5 w-5 place-items-center rounded-md font-bold ${styles[tone]}`}>{symbol}</span>{label}</span> }
function Empty({ children }) { return <div className="rounded-2xl border border-slate-100 bg-white px-4 py-12 text-center text-sm font-medium text-slate-500 shadow-sm">{children}</div> }
function StudentDetail({ student, report, monthName, year, onClose }) { return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/45 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section role="dialog" aria-modal="true" aria-labelledby="student-report-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-teal">Student attendance</p><h3 id="student-report-title" className="mt-1 text-xl font-extrabold">{student.name}</h3><p className="mt-1 text-sm text-slate-500">Roll {student.rollNumber}{student.studentCode ? ` · ${student.studentCode}` : ''} · {report.section.className}, Section {report.section.name}</p><p className="text-sm text-slate-500">{monthName} {year}</p></div><button aria-label="Close details" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button></div><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">{[['Present Days',student.summary.present],['Absent Days',student.summary.absent],['Holiday Days',student.summary.holiday],['Not Marked Days',student.summary.notMarked],['Attendance %',student.summary.attendancePercentage == null ? '—' : `${student.summary.attendancePercentage}%`]].map(([label,value])=><div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-extrabold">{value}</p></div>)}</div><h4 className="mb-2 mt-5 font-bold">Daily attendance</h4><ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">{Array.from({ length: report.period.daysInMonth }, (_, i) => { const iso=isoFor(report.period.year,report.period.month,i+1); const status=student.attendance[iso] || 'notMarked'; return <li key={iso} className="flex items-center justify-between px-3 py-2.5 text-sm"><span>{formatDay(iso)}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${symbolStyles[status]}`}>{status === 'notMarked' ? 'Not Marked' : status}</span></li> })}</ul></section></div> }
