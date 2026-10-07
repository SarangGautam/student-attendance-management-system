import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, CalendarDays, Check, CheckCheck, Circle, ClipboardCheck, RotateCcw, Save, X, Search, LockKeyhole, History, LoaderCircle } from 'lucide-react'
import { apiRequest } from '../services/api.js'

function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function displayDate(value) {
  if (!value) return ''
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function AttendancePage() {
  const location = useLocation()
  const initialParams = new URLSearchParams(location.search)
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [classId, setClassId] = useState(new URLSearchParams(location.search).get('classId') || '')
  const [sectionId, setSectionId] = useState(new URLSearchParams(location.search).get('sectionId') || '')
  const [date, setDate] = useState(initialParams.get('date') || localDateString())
  const [students, setStudents] = useState([])
  const [holiday, setHoliday] = useState(null)
  const [attendanceId, setAttendanceId] = useState('')
  const [marks, setMarks] = useState({})
  const [savedMarks, setSavedMarks] = useState({})
  const [className, setClassName] = useState('')
  const [sectionName, setSectionName] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [locked, setLocked] = useState(null)
  const [pendingDraft, setPendingDraft] = useState(null)
  const [draftEnabled, setDraftEnabled] = useState(false)
  const [draftStatus, setDraftStatus] = useState('')
  const [search, setSearch] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [historyRows, setHistoryRows] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

  const isFuture = date > localDateString()
  const dirty = useMemo(() => JSON.stringify(marks) !== JSON.stringify(savedMarks), [marks, savedMarks])
  const presentCount = students.reduce((count, student) => count + (marks[student._id] === 'present' ? 1 : 0), 0)
  const absentCount = students.reduce((count, student) => count + (marks[student._id] === 'absent' ? 1 : 0), 0)
  const unmarkedCount = students.length - presentCount - absentCount
  const attendancePercentage = presentCount + absentCount ? Math.round((presentCount / (presentCount + absentCount)) * 100) : null
  const visibleStudents = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    if (!term) return students
    const exactIdentifierMatches = students.filter((student) => [student.studentId, student.rollNumber].some((value) => String(value || '').toLocaleLowerCase() === term))
    if (exactIdentifierMatches.length) return exactIdentifierMatches
    return students.filter((student) => [student.name, student.rollNumber, student.studentId].some((value) => String(value || '').toLocaleLowerCase().includes(term)))
  }, [students, search])

  useEffect(() => {
    apiRequest('/api/classes').then((result) => setClasses(result.data)).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!sectionId || classId) return
    apiRequest(`/api/attendance?sectionId=${encodeURIComponent(sectionId)}&date=${encodeURIComponent(date)}`)
      .then((result) => setClassId(result.data.classId))
      .catch((err) => setError(err.message))
  }, [sectionId, classId, date])

  useEffect(() => {
    if (!classId) { setSections([]); return }
    apiRequest(`/api/sections?classId=${encodeURIComponent(classId)}`).then(({ data }) => {
      setSections(data)
      if (sectionId && !data.some((section) => section._id === sectionId)) setSectionId('')
    }).catch((err) => setError(err.message))
  }, [classId]) // section selection is intentionally retained when it belongs to the newly loaded class

  const loadDay = useCallback(async () => {
    if (!sectionId || !date) {
      setStudents([]); setHoliday(null); setAttendanceId(''); setMarks({}); setSavedMarks({}); return
    }
    setLoading(true); setError(''); setNotice('')
    try {
      const result = await apiRequest(`/api/attendance?sectionId=${encodeURIComponent(sectionId)}&date=${encodeURIComponent(date)}`)
      const roster = result.data.students
      const saved = result.data.attendance
      const draftResult = saved ? null : await apiRequest(`/api/attendance/draft?sectionId=${encodeURIComponent(sectionId)}&date=${encodeURIComponent(date)}`)
      const savedById = new Map((saved?.records || []).map((record) => [String(record.studentId), record.status]))
      const initialMarks = Object.fromEntries(roster.map((student) => [student._id, savedById.get(student._id) || '']))
      setStudents(roster)
      setHoliday(result.data.holiday)
      setAttendanceId(saved?._id || '')
      setLocked(saved?.lockedAt ? { lockedAt: saved.lockedAt, lockedByName: saved.lockedByName } : null)
      setPendingDraft(draftResult?.data?.draft || null)
      setDraftEnabled(false)
      setDraftStatus(draftResult?.data?.draft ? 'Draft saved' : '')
      setClassName(result.data.className)
      setSectionName(result.data.sectionName)
      setMarks(initialMarks)
      setSavedMarks(initialMarks)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [sectionId, date])

  useEffect(() => { loadDay() }, [loadDay])

  useEffect(() => {
    if (!draftEnabled || attendanceId || !sectionId || !students.length || isFuture || holiday || locked) return undefined
    setDraftStatus('Saving draft…')
    const timer = setTimeout(async () => {
      try {
        await apiRequest('/api/attendance/draft', { method: 'PUT', body: JSON.stringify({ sectionId, date, records: students.map((student) => ({ studentId: student._id, status: marks[student._id] || '' })) }) })
        setDraftStatus('Draft saved'); setPendingDraft(null)
      } catch (err) { setDraftStatus(`Unsaved changes · ${err.message}`) }
    }, 650)
    return () => clearTimeout(timer)
  }, [draftEnabled, attendanceId, sectionId, date, students, marks, isFuture, holiday, locked])

  useEffect(() => {
    if (!showHistory || !sectionId) return undefined
    let active = true
    setHistoryLoading(true); setHistoryError('')
    apiRequest(`/api/attendance/history?sectionId=${encodeURIComponent(sectionId)}&date=${encodeURIComponent(date)}`)
      .then(({ data }) => { if (active) setHistoryRows(data.items) }).catch((err) => { if (active) setHistoryError(err.message) })
      .finally(() => { if (active) setHistoryLoading(false) })
    return () => { active = false }
  }, [showHistory, sectionId, date, attendanceId])

  useEffect(() => {
    if (!dirty) return undefined
    const onBeforeUnload = (event) => { event.preventDefault(); event.returnValue = '' }
    const onDocumentClick = (event) => {
      const target = event.target.closest('a[href],button')
      if (!target) return
      const leavesPage = target.matches('a[href]')
        ? !target.target && target.origin === window.location.origin && target.pathname !== window.location.pathname
        : target.textContent.trim().toLowerCase() === 'logout'
      if (!leavesPage) return
      if (!window.confirm('You have unsaved attendance changes. Leave this page?')) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onDocumentClick, true)
    return () => { window.removeEventListener('beforeunload', onBeforeUnload); document.removeEventListener('click', onDocumentClick, true) }
  }, [dirty])

  function canDiscard() {
    return !dirty || window.confirm('You have unsaved attendance changes. Leave?')
  }

  function changeClass(value) {
    if (!canDiscard()) return
    setClassId(value); setSectionId(''); setStudents([]); setHoliday(null); setMarks({}); setSavedMarks({}); setAttendanceId('')
  }

  function changeSection(value) {
    if (!canDiscard()) return
    setSectionId(value); setStudents([]); setHoliday(null); setMarks({}); setSavedMarks({}); setAttendanceId('')
  }

  function changeDate(value) {
    if (!canDiscard()) return
    setDate(value); setStudents([]); setHoliday(null); setMarks({}); setSavedMarks({}); setAttendanceId('')
    if (value > localDateString()) setError('Attendance cannot be marked for a future date.')
  }

  function setAll(status) {
    setMarks(Object.fromEntries(students.map((student) => [student._id, status])))
    setDraftEnabled(true)
  }

  function resetMarks() {
    const prompt = attendanceId ? 'Clear the editable marks? Saved attendance stays unchanged until you submit a valid update.' : 'Reset all attendance draft changes?'
    if ((dirty || attendanceId) && !window.confirm(prompt)) return
    setMarks(Object.fromEntries(students.map((student) => [student._id, ''])))
    setDraftEnabled(true)
  }

  function continueDraft() {
    const draftById = new Map((pendingDraft?.records || []).map((record) => [String(record.studentId), record.status]))
    setMarks(Object.fromEntries(students.map((student) => [student._id, draftById.get(student._id) || ''])))
    setDraftEnabled(true); setPendingDraft(null)
  }
  async function discardDraft() {
    try { await apiRequest(`/api/attendance/draft?sectionId=${encodeURIComponent(sectionId)}&date=${encodeURIComponent(date)}`, { method: 'DELETE' }); setPendingDraft(null); setDraftEnabled(false); setDraftStatus(''); setMarks(Object.fromEntries(students.map((student) => [student._id, '']))); setSavedMarks(Object.fromEntries(students.map((student) => [student._id, '']))) }
    catch (err) { setError(err.message) }
  }
  async function lockRecord() {
    if (!attendanceId || locked || !window.confirm('Once locked, this attendance cannot be edited normally. Continue?')) return
    try { const result = await apiRequest(`/api/attendance/${attendanceId}/lock`, { method: 'POST' }); setLocked(result.data); setNotice('Attendance locked successfully.') }
    catch (err) { setError(err.message) }
  }

  async function save() {
    if (isFuture) { setError('Attendance cannot be marked for a future date.'); return }
    if (unmarkedCount > 0) { setError(`Please mark attendance for all students. ${unmarkedCount} ${unmarkedCount === 1 ? 'student is' : 'students are'} not marked.`); return }
    setSaving(true); setError(''); setNotice('')
    try {
      const payload = { sectionId, date, records: students.map((student) => ({ studentId: student._id, status: marks[student._id] })) }
      const result = await apiRequest(attendanceId ? `/api/attendance/${attendanceId}` : '/api/attendance', {
        method: attendanceId ? 'PUT' : 'POST', body: JSON.stringify(payload),
      })
      setAttendanceId(result.data._id)
      setLocked(result.data.lockedAt ? { lockedAt: result.data.lockedAt, lockedByName: result.data.lockedByName } : null)
      setDraftEnabled(false); setDraftStatus(''); setPendingDraft(null)
      setSavedMarks({ ...marks })
      setNotice(attendanceId ? 'Attendance updated successfully.' : 'Attendance saved successfully.')
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const selectedClass = classes.find((item) => item._id === classId)
  const futureDate = isFuture

  return (
    <div className="mx-auto max-w-5xl pb-52 sm:pb-8">
      <div className="mb-6 flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal/10 text-teal"><ClipboardCheck size={23} /></span>
        <div><p className="text-sm font-semibold text-teal">Daily record</p><h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Take Attendance</h2><p className="mt-1 text-sm text-slate-500">Choose a class, section, and date to get started.</p></div>
      </div>

      <section className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-3 sm:p-5" aria-label="Attendance selection">
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Class
          <select value={classId} onChange={(event) => changeClass(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-800 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15">
            <option value="">Select Class</option>{classes.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
          </select>
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Section
          <select value={sectionId} onChange={(event) => changeSection(event.target.value)} disabled={!classId} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-800 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15 disabled:bg-slate-50">
            <option value="">Select Section</option>{sections.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
          </select>
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Date
          <span className="relative mt-2 block"><CalendarDays size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="date" value={date} onChange={(event) => changeDate(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-base font-medium text-slate-800 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15" /></span>
        </label>
      </section>

      {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertTriangle size={18} className="mt-0.5 shrink-0" />{error}</div>}
      {notice && <div role="status" className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>}
      {futureDate && !holiday && <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Attendance cannot be marked for a future date.</div>}

      {sectionId && !loading && holiday && <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center sm:p-8"><span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-800">Holiday</span><h3 className="mt-3 text-2xl font-extrabold text-amber-950">{holiday.name}</h3><p className="mt-2 text-sm text-amber-800">Holiday — {holiday.name} · {displayDate(date)}</p><p className="mt-1 text-sm text-amber-700">Attendance is not required for this date.</p></section>}

      {sectionId && !loading && !futureDate && !holiday && <>
        <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-bold text-slate-900 sm:text-lg">{className || selectedClass?.name} <span className="text-slate-400">·</span> Section {sectionName || sections.find((item) => item._id === sectionId)?.name}</h3><span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold ${locked ? 'border-amber-200 bg-amber-50 text-amber-800' : attendanceId ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-100 bg-blue-50 text-blue-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${locked ? 'bg-amber-500' : attendanceId ? 'bg-emerald-500' : 'bg-blue-500'}`} />{locked ? 'Locked' : attendanceId ? 'Saved' : draftStatus ? 'Draft' : 'Not saved'}</span></div><p className="mt-1 text-sm text-slate-500">{displayDate(date)}</p></div><div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button type="button" onClick={() => setAll('present')} disabled={!students.length || Boolean(locked) || Boolean(pendingDraft)} className="min-h-11 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"><CheckCheck size={16} className="mr-1.5 inline" />Mark All Present</button>
            <button type="button" onClick={() => setAll('absent')} disabled={!students.length || Boolean(locked) || Boolean(pendingDraft)} className="min-h-11 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"><X size={16} className="mr-1.5 inline" />Mark All Absent</button>
            <button type="button" onClick={resetMarks} disabled={!students.length || Boolean(locked) || Boolean(pendingDraft)} className="min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RotateCcw size={15} className="mr-1.5 inline" />{attendanceId ? 'Reset Changes' : 'Reset Draft'}</button>
          </div></div>
          {pendingDraft && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-bold text-amber-900">Unsaved attendance draft found.</p><p className="mt-1 text-sm text-amber-800">Continue where you left off, or discard this draft. Final attendance has not been saved.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={continueDraft} className="min-h-10 rounded-lg bg-teal px-3 text-sm font-bold text-white">Continue Draft</button><button type="button" onClick={discardDraft} className="min-h-10 rounded-lg border border-amber-300 px-3 text-sm font-semibold text-amber-900">Discard Draft</button></div></div>}
          {draftStatus && <p role="status" className="mt-3 text-xs font-semibold text-slate-500"><span className="mr-2 rounded bg-amber-100 px-2 py-1 text-amber-800">DRAFT</span>{draftStatus}</p>}
          {locked && <div role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-bold"><LockKeyhole className="mr-1.5 inline" size={16} />Attendance Locked</p><p className="mt-1">Locked on {new Date(locked.lockedAt).toLocaleString()} by {locked.lockedByName || 'teacher'}.</p><p className="mt-1">Attendance for this date is locked.</p></div>}
          <label className="relative mt-4 block"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, roll no., or ID" className="form-input pl-10" aria-label="Search student name, roll number, or student ID" /></label>
        </section>

        <section aria-label="Attendance summary" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {[['Total Students', students.length, 'bg-slate-50 text-slate-700'], ['Present', presentCount, 'bg-emerald-50 text-emerald-700'], ['Absent', absentCount, 'bg-rose-50 text-rose-700'], ['Not Marked', unmarkedCount, 'bg-amber-50 text-amber-800'], ['Attendance', attendancePercentage == null ? '—' : `${attendancePercentage}%`, 'bg-blue-50 text-blue-800']].map(([label, count, style]) => <div key={label} className={`rounded-xl px-3 py-2.5 sm:py-3 ${style}`}><p className="text-[11px] font-semibold opacity-75">{label}</p><p className="mt-0.5 text-lg font-bold sm:text-xl">{count}</p></div>)}
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="hidden grid-cols-[4.5rem_minmax(0,1.25fr)_minmax(7rem,.75fr)_17rem] gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-[10px] font-semibold uppercase tracking-[.1em] text-slate-500 sm:grid"><span>Roll</span><span>Student</span><span>Student ID</span><span>Status</span></div>
          {loading ? <p className="p-6 text-center text-sm text-slate-500">Loading students…</p> : students.length === 0 ? <div className="p-8 text-center"><p className="font-bold text-slate-700">No active students in this section.</p><p className="mt-1 text-sm text-slate-500">Add students from Student Management to take attendance.</p></div> : visibleStudents.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No students match this search.</p> : <div className="divide-y divide-slate-100">
            {visibleStudents.map((student) => <article key={student._id} className="attendance-student-row grid gap-3 px-3.5 py-3.5 sm:grid-cols-[4.5rem_minmax(0,1.25fr)_minmax(7rem,.75fr)_17rem] sm:items-center sm:gap-4 sm:px-5 sm:py-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 sm:block sm:text-xs"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-slate-100 font-bold text-slate-700 sm:hidden">{String(student.rollNumber).slice(0, 3)}</span><span className="sm:hidden">Roll</span><span className="hidden text-slate-700 sm:inline">{student.rollNumber}</span></div>
              <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-slate-900 sm:text-sm">{student.name}</p><p className="mt-0.5 truncate text-[11px] text-slate-500 sm:hidden">ID: {student.studentId || '—'}</p></div>
              <div className="hidden min-w-0 truncate text-xs text-slate-500 sm:block">{student.studentId || '—'}</div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={Boolean(locked) || Boolean(pendingDraft)} aria-pressed={marks[student._id] === 'present'} onClick={() => { setMarks((current) => ({ ...current, [student._id]: 'present' })); setDraftEnabled(true) }} className={`min-h-12 rounded-xl border px-3 py-2 text-sm font-bold transition ${marks[student._id] === 'present' ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'} disabled:cursor-not-allowed disabled:opacity-50`}><Check size={17} className="mr-1.5 inline" />Present</button>
                <button type="button" disabled={Boolean(locked) || Boolean(pendingDraft)} aria-pressed={marks[student._id] === 'absent'} onClick={() => { setMarks((current) => ({ ...current, [student._id]: 'absent' })); setDraftEnabled(true) }} className={`min-h-12 rounded-xl border px-3 py-2 text-sm font-bold transition ${marks[student._id] === 'absent' ? 'border-rose-600 bg-rose-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50'} disabled:cursor-not-allowed disabled:opacity-50`}><Circle size={15} className="mr-1.5 inline" />Absent</button>
              </div>
            </article>)}
          </div>}
        </section>
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:static sm:mt-4 sm:flex sm:items-center sm:justify-between sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <div className="mb-2 grid grid-cols-2 gap-2 sm:mb-0 sm:flex sm:flex-wrap"><button type="button" onClick={() => setShowHistory((value) => !value)} className="min-h-11 rounded-xl border border-slate-200 px-2 text-xs font-semibold text-slate-600 sm:px-3 sm:text-sm"><History className="mr-1 inline" size={15} />{showHistory ? 'Hide History' : 'History'}</button>{attendanceId && !locked && <button type="button" onClick={lockRecord} className="min-h-11 rounded-xl border border-amber-200 px-2 text-xs font-semibold text-amber-800 sm:px-3 sm:text-sm"><LockKeyhole className="mr-1 inline" size={15} />Lock</button>}</div>
          <button type="button" onClick={save} disabled={loading || saving || futureDate || Boolean(holiday) || !students.length || Boolean(locked) || Boolean(pendingDraft)} className="min-h-12 w-full rounded-xl bg-teal px-5 py-3 text-base font-extrabold text-white shadow-lg shadow-teal/15 hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"><Save size={18} className="mr-2 inline" />{saving ? 'Saving…' : locked ? 'Attendance Locked' : attendanceId ? 'Update Attendance' : 'Save Attendance'}</button>
        </div>
        {showHistory && <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">Attendance Change History</h3><p className="text-xs text-slate-500">Saved changes only; draft edits are not included.</p></div><label className="text-xs font-semibold text-slate-500">Filter by student<select className="form-input mt-1 min-h-10" onChange={(event) => { const studentId = event.target.value; const query = new URLSearchParams({ sectionId }); if (studentId) query.set('studentId', studentId); if (date) query.set('date', date); setHistoryLoading(true); apiRequest(`/api/attendance/history?${query}`).then(({ data }) => setHistoryRows(data.items)).catch((err) => setHistoryError(err.message)).finally(() => setHistoryLoading(false)) }}><option value="">All students</option>{students.map((student) => <option key={student._id} value={student._id}>{student.name}</option>)}</select></label></div>{historyError && <p role="alert" className="mt-3 text-sm text-rose-700">{historyError}</p>}{historyLoading ? <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin" />Loading history…</p> : historyRows.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Date', 'Student', 'Old Status', 'New Status', 'Changed By', 'Changed At'].map((label) => <th key={label} className="px-3 py-2.5">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{historyRows.map((row) => <tr key={row._id}><td className="px-3 py-2.5">{row.date.slice(0, 10)}</td><td className="px-3 py-2.5">{row.studentName} · {row.rollNumber}</td><td className="px-3 py-2.5 capitalize">{row.oldStatus}</td><td className="px-3 py-2.5 capitalize">{row.newStatus}</td><td className="px-3 py-2.5">{row.changedByName}</td><td className="px-3 py-2.5">{new Date(row.changedAt).toLocaleString()}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-slate-500">No saved changes for this date and section.</p>}</section>}
      </>}
      {!sectionId && <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Select a class and section to view its active students.</div>}
    </div>
  )
}
