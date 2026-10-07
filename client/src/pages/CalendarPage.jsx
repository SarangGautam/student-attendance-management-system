import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Gift, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../services/api.js'

const holidayTypes = ['Public Holiday', 'Festival', 'School Holiday', 'Other']

function localToday() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function makeMonthDays(year, month) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const leading = (firstWeekday + 6) % 7
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells = Math.ceil((leading + count) / 7) * 7
  return Array.from({ length: cells }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, 1 - leading + index))
    return { iso: date.toISOString().slice(0, 10), day: date.getUTCDate(), inMonth: date.getUTCMonth() === month - 1, weekday: date.getUTCDay() }
  })
}

function monthTitle(year, month) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function formatDate(iso, options = { day: '2-digit', month: 'long', year: 'numeric' }) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-IN', { ...options, timeZone: 'UTC' })
}

const blankHoliday = (date) => ({ date, name: '', type: 'Public Holiday', description: '' })

export default function CalendarPage() {
  const navigate = useNavigate()
  const today = localToday()
  const [year, setYear] = useState(Number(today.slice(0, 4)))
  const [month, setMonth] = useState(Number(today.slice(5, 7)))
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [markedDates, setMarkedDates] = useState(new Set())
  const [holidays, setHolidays] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [selectedHoliday, setSelectedHoliday] = useState(null)
  const [holidayForm, setHolidayForm] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [calendarLoading, setCalendarLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const monthDays = useMemo(() => makeMonthDays(year, month), [year, month])
  const holidaysByDate = useMemo(() => new Map(holidays.map((holiday) => [holiday.date.slice(0, 10), holiday])), [holidays])
  const selectedClass = classes.find((item) => item._id === classId)
  const selectedSection = sections.find((item) => item._id === sectionId)

  useEffect(() => {
    apiRequest('/api/classes').then(({ data }) => setClasses(data)).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!classId) { setSections([]); setSectionId(''); return }
    apiRequest(`/api/sections?classId=${encodeURIComponent(classId)}`).then(({ data }) => setSections(data)).catch((err) => setError(err.message))
  }, [classId])

  async function loadCalendar() {
    setCalendarLoading(true)
    setError('')
    try {
      const [holidayResult, upcomingResult, attendanceResult] = await Promise.all([
        apiRequest(`/api/holidays?month=${month}&year=${year}`),
        apiRequest('/api/holidays?upcoming=true&limit=5'),
        sectionId ? apiRequest(`/api/attendance/calendar?sectionId=${encodeURIComponent(sectionId)}&month=${month}&year=${year}`) : Promise.resolve({ data: { markedDates: [] } }),
      ])
      setHolidays(holidayResult.data)
      setUpcoming(upcomingResult.data)
      setMarkedDates(new Set(attendanceResult.data.markedDates))
    } catch (err) { setError(err.message) }
    finally { setCalendarLoading(false) }
  }

  useEffect(() => { loadCalendar() }, [month, year, sectionId])

  function moveMonth(offset) {
    const date = new Date(Date.UTC(year, month - 1 + offset, 1))
    setYear(date.getUTCFullYear())
    setMonth(date.getUTCMonth() + 1)
  }

  function goToday() {
    setYear(Number(today.slice(0, 4)))
    setMonth(Number(today.slice(5, 7)))
  }

  function chooseClass(value) {
    setClassId(value)
    setSectionId('')
  }

  async function clickDate(day) {
    if (calendarLoading) return
    const outsideMonth = day.iso.slice(0, 7) !== `${year}-${String(month).padStart(2, '0')}`
    if (outsideMonth) {
      setYear(Number(day.iso.slice(0, 4)))
      setMonth(Number(day.iso.slice(5, 7)))
    }
    let holiday = holidaysByDate.get(day.iso)
    if (!holiday && outsideMonth) {
      try {
        const result = await apiRequest(`/api/holidays?date=${day.iso}`)
        holiday = result.data[0]
      } catch (err) { setError(err.message); return }
    }
    if (holiday) { setSelectedHoliday(holiday); return }
    if (!sectionId) { setError('Select a class and section before opening attendance.'); return }
    navigate(`/attendance?sectionId=${encodeURIComponent(sectionId)}&date=${day.iso}`)
  }

  function openAddHoliday() {
    setSelectedHoliday(null)
    setHolidayForm(blankHoliday(today))
    setNotice('')
    setError('')
  }

  function openEditHoliday(holiday) {
    setSelectedHoliday(null)
    setHolidayForm({ date: holiday.date.slice(0, 10), name: holiday.name, type: holiday.type, description: holiday.description || '', _id: holiday._id })
    setNotice('')
    setError('')
  }

  function updateHolidayField(field, value) {
    setHolidayForm((current) => ({ ...current, [field]: value }))
  }

  async function saveHoliday(event) {
    event.preventDefault()
    if (!holidayForm.date) { setError('Holiday date is required.'); return }
    if (!holidayForm.name.trim()) { setError('Holiday name is required.'); return }
    setBusy(true); setError('')
    try {
      const { _id, ...payload } = holidayForm
      await apiRequest(_id ? `/api/holidays/${_id}` : '/api/holidays', { method: _id ? 'PUT' : 'POST', body: JSON.stringify(payload) })
      setHolidayForm(null)
      setNotice(_id ? 'Holiday updated successfully.' : 'Holiday added successfully.')
      const targetYear = Number(payload.date.slice(0, 4))
      const targetMonth = Number(payload.date.slice(5, 7))
      if (targetYear === year && targetMonth === month) await loadCalendar()
      else { setYear(targetYear); setMonth(targetMonth) }
    } catch (err) { setError(err.message.includes('already exists') ? 'A holiday already exists on this date.' : err.message) }
    finally { setBusy(false) }
  }

  async function deleteHoliday() {
    if (!selectedHoliday) return
    setBusy(true); setError('')
    try {
      await apiRequest(`/api/holidays/${selectedHoliday._id}`, { method: 'DELETE' })
      setSelectedHoliday(null)
      setDeleteConfirm(false)
      setNotice('Holiday deleted. The date is now a normal date.')
      await loadCalendar()
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  function statusFor(day) {
    if (calendarLoading) return 'loading'
    if (holidaysByDate.has(day.iso)) return 'holiday'
    if (markedDates.has(day.iso)) return 'marked'
    return 'unmarked'
  }

  const weekdays = [
    ['Monday', 'Mon', 'M'], ['Tuesday', 'Tue', 'T'], ['Wednesday', 'Wed', 'W'], ['Thursday', 'Thu', 'T'], ['Friday', 'Fri', 'F'], ['Saturday', 'Sat', 'S'], ['Sunday', 'Sun', 'S'],
  ]

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal/10 text-teal"><CalendarDays size={23} /></span><div><p className="text-sm font-semibold text-teal">Plan school days</p><h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Attendance Calendar</h2><p className="mt-1 text-sm text-slate-500">Review attendance dates and manage school holidays.</p></div></div>
        <button type="button" onClick={openAddHoliday} className="min-h-11 w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal/90 sm:w-auto"><Plus size={17} className="mr-1.5 inline" />Add Holiday</button>
      </div>

      {error && <div role="alert" className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <section className="mb-4 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5" aria-label="Calendar filters">
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Class
          <select value={classId} onChange={(event) => chooseClass(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-800 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15"><option value="">Select Class</option>{classes.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Section
          <select value={sectionId} disabled={!classId} onChange={(event) => setSectionId(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-800 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15 disabled:bg-slate-50"><option value="">Select Section</option>{sections.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
        </label>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3 sm:p-5">
          <div className="flex items-center gap-1"><button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronLeft size={20} /></button><button type="button" aria-label="Next month" onClick={() => moveMonth(1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronRight size={20} /></button><h3 className="ml-2 min-w-0 text-lg font-extrabold sm:ml-3 sm:text-xl">{monthTitle(year, month)}</h3></div>
          <button type="button" onClick={goToday} className="min-h-11 rounded-xl border border-teal/20 bg-teal/5 px-4 py-2 text-sm font-bold text-teal hover:bg-teal/10">Today</button>
        </div>
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {weekdays.map(([full, short, letter], index) => <div key={full} className={`px-0.5 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:px-2 sm:py-3 sm:text-xs ${index > 4 ? 'text-slate-400' : ''}`}><span className="hidden sm:inline">{full}</span><span className="sm:hidden">{letter}</span><span className="sr-only">{short}</span></div>)}
        </div>
        <div className="grid grid-cols-7">
          {monthDays.map((day) => {
            const status = statusFor(day)
            const holiday = holidaysByDate.get(day.iso)
            const isToday = day.iso === today
            const statusText = status === 'loading' ? 'Loading calendar' : status === 'holiday' ? `Holiday — ${holiday.name}` : status === 'marked' ? 'Attendance marked' : 'Not marked'
            return <button key={day.iso} type="button" disabled={calendarLoading} onClick={() => clickDate(day)} aria-label={`${formatDate(day.iso)}, ${statusText}${isToday ? ', Today' : ''}`} title={`${formatDate(day.iso)} · ${statusText}`} className={`group relative flex min-h-[68px] min-w-0 flex-col items-start border-b border-r border-slate-100 p-1.5 text-left transition hover:bg-teal/5 focus:z-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal disabled:cursor-wait sm:min-h-[94px] sm:p-2.5 ${!day.inMonth ? 'bg-slate-50/70 text-slate-300' : day.weekday === 0 || day.weekday === 6 ? 'bg-slate-50/40' : 'bg-white'} ${isToday ? 'z-[1] ring-2 ring-inset ring-teal' : ''}`}>
              <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-bold sm:h-7 sm:min-w-7 sm:text-sm ${isToday ? 'bg-teal text-white' : day.inMonth ? 'text-slate-700' : 'text-slate-300'}`}>{day.day}</span>
              {isToday && <span className="mt-0.5 hidden text-[9px] font-extrabold uppercase tracking-wide text-teal sm:block">Today</span>}
              <span className={`mt-auto inline-flex max-w-full items-center gap-0.5 truncate rounded-md px-1 py-0.5 text-[9px] font-bold leading-none sm:gap-1 sm:px-1.5 sm:py-1 ${status === 'holiday' ? 'bg-amber-50 text-amber-800' : status === 'marked' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400'}`}>
                {status === 'holiday' ? <><Gift size={12} /><span className="hidden truncate sm:inline">Holiday</span></> : status === 'marked' ? <><Check size={12} /><span className="hidden sm:inline">Marked</span></> : status === 'loading' ? <><Clock3 size={11} /><span className="hidden sm:inline">Loading</span></> : <><Clock3 size={11} /><span className="hidden sm:inline">Not Marked</span></>}
              </span>
              {holiday && <span className="mt-0.5 hidden w-full truncate text-[9px] font-medium text-amber-800 sm:block">{holiday.name}</span>}
            </button>
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 px-3 py-3 text-[11px] font-medium text-slate-500 sm:px-5 sm:text-xs"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Attendance recorded</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Holiday</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-slate-300" />Not marked</span></div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="font-extrabold">Upcoming Holidays</h3><p className="mt-0.5 text-xs text-slate-500">Dates configured for your school.</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">{upcoming.length}</span></div>
        {upcoming.length ? <ul className="divide-y divide-slate-100">{upcoming.map((holiday) => <li key={holiday._id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm font-bold text-slate-800">{formatDate(holiday.date.slice(0, 10), { day: '2-digit', month: 'short' })} · {holiday.name}</span><span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{holiday.type}</span></li>)}</ul> : <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">No upcoming holidays.</p>}
      </section>

      {selectedHoliday && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelectedHoliday(null); setDeleteConfirm(false) } }}>
        <section role="dialog" aria-modal="true" aria-labelledby="holiday-detail-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><Gift size={20} /></span><div><p className="text-xs font-bold uppercase tracking-wide text-amber-700">Holiday</p><h3 id="holiday-detail-title" className="text-xl font-extrabold">{selectedHoliday.name}</h3></div></div><button type="button" aria-label="Close holiday details" onClick={() => { setSelectedHoliday(null); setDeleteConfirm(false) }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div>
          <dl className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4"><div><dt className="text-xs font-semibold uppercase text-slate-400">Date</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{formatDate(selectedHoliday.date.slice(0, 10))}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-400">Type</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{selectedHoliday.type}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-400">Description</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{selectedHoliday.description || '—'}</dd></div></dl>
          {deleteConfirm ? <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3"><p className="text-sm font-semibold text-rose-800">Are you sure you want to delete this holiday?</p><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setDeleteConfirm(false)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600">Cancel</button><button type="button" disabled={busy} onClick={deleteHoliday} className="min-h-10 rounded-lg bg-rose-600 px-3 text-sm font-bold text-white disabled:opacity-60">Delete</button></div></div> : <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDeleteConfirm(true)} className="min-h-11 rounded-xl border border-rose-200 px-3.5 text-sm font-bold text-rose-700 hover:bg-rose-50"><Trash2 size={16} className="mr-1.5 inline" />Delete</button><button type="button" onClick={() => openEditHoliday(selectedHoliday)} className="min-h-11 rounded-xl bg-teal px-3.5 text-sm font-bold text-white hover:bg-teal/90"><Pencil size={15} className="mr-1.5 inline" />Edit Holiday</button></div>}
        </section>
      </div>}

      {holidayForm && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHolidayForm(null) }}>
        <section role="dialog" aria-modal="true" aria-labelledby="holiday-form-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-teal">School dates</p><h3 id="holiday-form-title" className="text-xl font-extrabold">{holidayForm._id ? 'Edit Holiday' : 'Add Holiday'}</h3></div><button type="button" aria-label="Close holiday form" onClick={() => setHolidayForm(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div>
          <form onSubmit={saveHoliday} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Holiday Date<input type="date" required value={holidayForm.date} onChange={(event) => updateHolidayField('date', event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15" /></label>
            <label className="block text-sm font-semibold text-slate-700">Holiday Name<input autoFocus required maxLength={120} value={holidayForm.name} onChange={(event) => updateHolidayField('name', event.target.value)} placeholder="e.g. Annual School Holiday" className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15" /></label>
            <label className="block text-sm font-semibold text-slate-700">Holiday Type<select required value={holidayForm.type} onChange={(event) => updateHolidayField('type', event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15">{holidayTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
            <label className="block text-sm font-semibold text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span><textarea maxLength={500} rows={3} value={holidayForm.description} onChange={(event) => updateHolidayField('description', event.target.value)} placeholder="Add any helpful details" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15" /></label>
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end"><button type="button" onClick={() => setHolidayForm(null)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">Cancel</button><button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-teal px-4 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Saving…' : holidayForm._id ? 'Save Changes' : 'Add Holiday'}</button></div>
          </form>
        </section>
      </div>}
    </div>
  )
}
