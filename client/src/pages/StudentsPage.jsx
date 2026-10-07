import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRightLeft, FileSpreadsheet, History, LoaderCircle, Pencil, Plus, Search, Upload, UserRound, X } from 'lucide-react'
import { apiRequest } from '../services/api.js'

const inputClass = 'form-input'
const todayDateInput = (() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` })()
const emptyForm = { studentId: '', rollNumber: '', name: '', classId: '', sectionId: '', parentName: '', parentContact: '', status: 'active' }

function Modal({ title, onClose, children, size = 'max-w-xl' }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="student-modal-title" className={`flex max-h-[94vh] w-full ${size} flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl`}><header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><h2 id="student-modal-title" className="text-lg font-bold">{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={19} /></button></header><div className="overflow-y-auto p-5 sm:p-6">{children}</div></section>
  </div>
}

function StudentForm({ initial, classes, onCancel, onSave, saving, error }) {
  const [form, setForm] = useState({ ...emptyForm, ...initial, classId: initial?.classId?._id || initial?.classId || '', sectionId: initial?.sectionId?._id || initial?.sectionId || '' })
  const [sections, setSections] = useState([])
  const [sectionLoading, setSectionLoading] = useState(false)
  const [formError, setFormError] = useState('')
  useEffect(() => {
    if (!form.classId) { setSections([]); setForm((current) => ({ ...current, sectionId: '' })); return }
    let active = true
    setSectionLoading(true)
    apiRequest(`/api/sections?classId=${encodeURIComponent(form.classId)}`).then(({ data }) => {
      if (active) {
        setSections(data)
        setForm((current) => data.some((section) => section._id === current.sectionId) ? current : { ...current, sectionId: '' })
      }
    }).catch((requestError) => { if (active) setFormError(requestError.message) }).finally(() => { if (active) setSectionLoading(false) })
    return () => { active = false }
  }, [form.classId])
  function change(key, value) { setForm((current) => ({ ...current, [key]: value })); setFormError('') }
  function submit(event) {
    event.preventDefault()
    if (!form.name.trim()) return setFormError('Student name is required.')
    if (!form.rollNumber.trim()) return setFormError('Roll number is required.')
    if (!form.classId) return setFormError('Please select a class.')
    if (!form.sectionId) return setFormError('Please select a section.')
    if (form.parentContact.trim() && !/^[+()\-\s\d.]{5,40}$/.test(form.parentContact.trim())) return setFormError('Enter a valid parent contact number.')
    onSave({ ...form, studentId: form.studentId.trim(), rollNumber: form.rollNumber.trim(), name: form.name.trim(), parentName: form.parentName.trim(), parentContact: form.parentContact.trim() })
  }
  const fields = [
    ['studentId', 'Student ID', 'STU001'], ['rollNumber', 'Roll Number *', '1'], ['name', 'Student Name *', 'Student full name'],
    ['parentName', 'Parent / Guardian Name', 'Parent or guardian'], ['parentContact', 'Parent Contact', '+1 555 0100'],
  ]
  return <form onSubmit={submit} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">{fields.slice(0, 3).map(([key, label, placeholder]) => <label key={key} className={key === 'name' ? 'sm:col-span-2' : ''}><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span><input className={inputClass} value={form[key]} onChange={(event) => change(key, event.target.value)} placeholder={placeholder} maxLength={key === 'name' ? 120 : key === 'rollNumber' ? 40 : 80} /></label>)}
      <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Class *</span><select className={inputClass} value={form.classId} onChange={(event) => setForm((current) => ({ ...current, classId: event.target.value, sectionId: '' }))}><option value="">Select class</option>{classes.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
      <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Section *</span><select className={inputClass} value={form.sectionId} disabled={!form.classId || sectionLoading} onChange={(event) => change('sectionId', event.target.value)}><option value="">{sectionLoading ? 'Loading sections…' : 'Select section'}</option>{sections.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
      {fields.slice(3).map(([key, label, placeholder]) => <label key={key}><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span><input className={inputClass} value={form[key]} onChange={(event) => change(key, event.target.value)} placeholder={placeholder} maxLength={key === 'parentName' ? 120 : 40} inputMode={key === 'parentContact' ? 'tel' : undefined} /></label>)}
      <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Status</span><select className={inputClass} value={form.status} onChange={(event) => change('status', event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
    </div>
    {(formError || error) && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError || error}</p>}
    <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600">Cancel</button><button disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal px-4 text-sm font-semibold text-white disabled:opacity-60">{saving && <LoaderCircle className="animate-spin" size={16} />}{initial?._id ? 'Save Changes' : 'Add Student'}</button></div>
  </form>
}

function normalizeHeader(value) { return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '') }
const importColumns = { studentid: 'studentId', rollnumber: 'rollNumber', studentname: 'name', name: 'name', parentname: 'parentName', parentcontact: 'parentContact' }

export default function StudentsPage() {
  const [searchParams] = useSearchParams()
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [classId, setClassId] = useState(searchParams.get('classId') || '')
  const [sectionId, setSectionId] = useState(searchParams.get('sectionId') || '')
  const [status, setStatus] = useState('active')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [result, setResult] = useState({ students: [], total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState(null)
  const [confirmStudent, setConfirmStudent] = useState(null)
  const [importClassId, setImportClassId] = useState('')
  const [importSectionId, setImportSectionId] = useState('')
  const [importSections, setImportSections] = useState([])
  const [importFile, setImportFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [importError, setImportError] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [transferStudent, setTransferStudent] = useState(null)
  const [transferForm, setTransferForm] = useState({ classId: '', sectionId: '', effectiveDate: new Date().toLocaleDateString('en-CA') })
  const [transferSections, setTransferSections] = useState([])
  const [transferBusy, setTransferBusy] = useState(false)
  const [historyStudent, setHistoryStudent] = useState(null)
  const [enrollmentHistory, setEnrollmentHistory] = useState([])

  useEffect(() => { apiRequest('/api/classes').then(({ data }) => setClasses(data)).catch((e) => setError(e.message)) }, [])
  useEffect(() => {
    if (!classId) { setSections([]); setSectionId(''); return }
    let active = true
    apiRequest(`/api/sections?classId=${encodeURIComponent(classId)}`).then(({ data }) => {
      if (active) { setSections(data); if (!data.some((item) => item._id === sectionId)) setSectionId('') }
    }).catch((e) => { if (active) setError(e.message) })
    return () => { active = false }
  }, [classId])
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250); return () => clearTimeout(timer) }, [search])

  const loadStudents = useCallback(async () => {
    setLoading(true); setError('')
    const query = new URLSearchParams({ page: String(page), limit: String(limit), status })
    if (classId) query.set('classId', classId)
    if (sectionId) query.set('sectionId', sectionId)
    if (debouncedSearch) query.set('search', debouncedSearch)
    try { const { data } = await apiRequest(`/api/students?${query}`); setResult(data) }
    catch (requestError) { setError(requestError.message) }
    finally { setLoading(false) }
  }, [page, limit, status, classId, sectionId, debouncedSearch])
  useEffect(() => { loadStudents() }, [loadStudents])

  const className = useMemo(() => classes.find((item) => item._id === classId)?.name || '', [classes, classId])
  const visiblePages = useMemo(() => {
    const total = result.totalPages
    const start = Math.max(1, Math.min(page - 2, total - 4))
    return Array.from({ length: Math.max(0, Math.min(5, total)) }, (_, index) => start + index)
  }, [page, result.totalPages])

  async function saveStudent(values) {
    setSaving(true); setError('')
    try {
      if (modal.student?._id) await apiRequest(`/api/students/${modal.student._id}`, { method: 'PUT', body: JSON.stringify(values) })
      else await apiRequest('/api/students', { method: 'POST', body: JSON.stringify(values) })
      setNotice(modal.student?._id ? 'Student updated successfully.' : 'Student created successfully.')
      setModal(null); setPage(1); await loadStudents()
    } catch (requestError) { setError(requestError.message) }
    finally { setSaving(false) }
  }

  async function deactivate() {
    if (!confirmStudent) return
    setSaving(true)
    try { await apiRequest(`/api/students/${confirmStudent._id}`, { method: 'DELETE' }); setNotice('Student deactivated successfully.'); setConfirmStudent(null); await loadStudents() }
    catch (requestError) { setError(requestError.message); setConfirmStudent(null) }
    finally { setSaving(false) }
  }

  async function reactivate(student) {
    try { await apiRequest(`/api/students/${student._id}`, { method: 'PUT', body: JSON.stringify({ ...student, classId: student.classId._id, sectionId: student.sectionId._id, status: 'active' }) }); setNotice('Student reactivated successfully.'); await loadStudents() }
    catch (requestError) { setError(requestError.message) }
  }

  async function openTransfer(student) {
    setError(''); setTransferStudent(student); setTransferForm({ classId: '', sectionId: '', effectiveDate: new Date().toLocaleDateString('en-CA') }); setTransferSections([])
  }
  async function loadTransferSections(nextClassId) {
    setTransferForm((current) => ({ ...current, classId: nextClassId, sectionId: '' }))
    if (!nextClassId) { setTransferSections([]); return }
    try { const { data } = await apiRequest(`/api/sections?classId=${encodeURIComponent(nextClassId)}`); setTransferSections(data) }
    catch (requestError) { setError(requestError.message) }
  }
  async function submitTransfer() {
    if (!transferStudent || !transferForm.classId || !transferForm.sectionId || !transferForm.effectiveDate) return setError('Choose a destination class, section, and effective date.')
    const nextClass = classes.find((item) => item._id === transferForm.classId)
    const nextSection = transferSections.find((item) => item._id === transferForm.sectionId)
    const currentClass = transferStudent.classId?.name || ''
    const currentSection = transferStudent.sectionId?.name || ''
    const effective = new Date(`${transferForm.effectiveDate}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    if (!window.confirm(`Transfer ${transferStudent.name} from ${currentClass}-${currentSection} to ${nextClass?.name}-${nextSection?.name} effective ${effective}?`)) return
    setTransferBusy(true); setError('')
    try { const response = await apiRequest(`/api/students/${transferStudent._id}/transfer`, { method: 'POST', body: JSON.stringify(transferForm) }); setNotice(response.message); setTransferStudent(null); await loadStudents() }
    catch (requestError) { setError(requestError.message) } finally { setTransferBusy(false) }
  }
  async function showEnrollmentHistory(student) {
    setHistoryStudent(student); setEnrollmentHistory([])
    try { const { data } = await apiRequest(`/api/students/${student._id}/enrollments`); setEnrollmentHistory(data) }
    catch (requestError) { setError(requestError.message); setHistoryStudent(null) }
  }

  function openImport() {
    setImportClassId(classId); setImportSectionId(sectionId); setImportFile(null); setPreview(null); setImportError(''); setNotice(''); setModal({ type: 'import' })
    setImportSections(sections)
  }

  async function selectImportClass(nextId) {
    setImportClassId(nextId); setImportSectionId(''); setPreview(null)
    if (!nextId) { setImportSections([]); return }
    try { const { data } = await apiRequest(`/api/sections?classId=${encodeURIComponent(nextId)}`); setImportSections(data) }
    catch (requestError) { setImportError(requestError.message) }
  }

  async function previewFile(file) {
    setImportFile(file); setPreview(null); setImportError('')
    if (!importClassId || !importSectionId) { setImportError('Choose a class and section before selecting an import file.'); return }
    setImportBusy(true)
    try {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      if (!worksheet) throw new Error('The selected file has no worksheet.')
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' })
      if (rows.length < 2) throw new Error('The file contains no student rows.')
      const headers = rows[0].map(normalizeHeader)
      const mapping = headers.map((header) => importColumns[header] || '')
      if (!mapping.includes('rollNumber') || !mapping.includes('name')) throw new Error('Include Roll Number and Student Name columns in the file.')
      const students = rows.slice(1).map((cells, index) => ({
        _rowNumber: index + 2,
        ...Object.fromEntries(mapping.map((key, column) => key ? [key, String(cells[column] ?? '').trim()] : null).filter(Boolean)),
      })).filter((row) => Object.entries(row).some(([key, value]) => key !== '_rowNumber' && value))
      if (!students.length) throw new Error('The file contains no student rows.')
      const { data } = await apiRequest('/api/students/bulk-import/preview', { method: 'POST', body: JSON.stringify({ classId: importClassId, sectionId: importSectionId, students }) })
      setPreview({ ...data, students })
    } catch (requestError) { setImportError(requestError.message) }
    finally { setImportBusy(false) }
  }

  async function commitImport() {
    if (!preview) return
    setImportBusy(true); setImportError('')
    try {
      const response = await apiRequest('/api/students/bulk-import', { method: 'POST', body: JSON.stringify({ classId: importClassId, sectionId: importSectionId, students: preview.students }) })
      setNotice(response.message); setModal(null); setPage(1); await loadStudents()
    } catch (requestError) { setImportError(requestError.message) }
    finally { setImportBusy(false) }
  }

  async function downloadTemplate() {
    const XLSX = await import('xlsx')
    const sheet = XLSX.utils.aoa_to_sheet([['Student ID', 'Roll Number', 'Student Name', 'Parent Name', 'Parent Contact']])
    sheet['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 28 }, { wch: 26 }, { wch: 20 }]
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Students'); XLSX.writeFile(workbook, 'student-import-template.xlsx')
  }

  function changeFilter(setter, value) { setter(value); setPage(1); setNotice('') }
  function statusPill(value) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${value === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{value}</span> }
  function studentActions(student) { return <div className="flex flex-wrap items-center gap-2"><button title="Edit student" aria-label={`Edit ${student.name}`} onClick={() => { setError(''); setModal({ type: 'form', student }) }} className="grid min-h-10 min-w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><Pencil size={16} /></button><button onClick={() => showEnrollmentHistory(student)} className="grid min-h-10 min-w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" title="Enrollment history" aria-label={`Enrollment history for ${student.name}`}><History size={16} /></button>{student.status === 'active' ? <><button onClick={() => openTransfer(student)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-teal/20 px-3 text-sm font-semibold text-teal hover:bg-teal/5"><ArrowRightLeft size={15} />Transfer</button><button onClick={() => setConfirmStudent(student)} className="min-h-10 rounded-xl border border-rose-100 px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50">Deactivate</button></> : <button onClick={() => reactivate(student)} className="min-h-10 rounded-xl border border-emerald-100 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">Reactivate</button>}</div> }

  return <div className="min-w-0">
    <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div><p className="text-sm font-medium text-teal">Student records</p><h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Student Management</h2><p className="mt-2 text-sm text-slate-500">Manage student profiles across your classes and sections.</p></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex"><button onClick={openImport} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Upload size={17} /> Import Students</button><button onClick={() => { setError(''); setModal({ type: 'form', student: null, defaults: { ...emptyForm, classId, sectionId } }) }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal/90"><Plus size={18} /> Add Student</button></div></div>
    {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{notice}</div>}
    {error && !modal && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

    <section aria-label="Student filters" className="mb-5 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.5fr_.8fr]">
      <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Class</span><select className={inputClass} value={classId} onChange={(event) => { setClassId(event.target.value); setSectionId(''); setPage(1) }}><option value="">All classes</option>{classes.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
      <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Section</span><select className={inputClass} value={sectionId} disabled={!classId} onChange={(event) => changeFilter(setSectionId, event.target.value)}><option value="">All sections</option>{sections.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
      <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span><span className="relative block"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className={`${inputClass} pl-10`} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Name, roll number, or student ID" /></span></label>
      <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span><select className={inputClass} value={status} onChange={(event) => changeFilter(setStatus, event.target.value)}><option value="active">Active</option><option value="all">All</option><option value="inactive">Inactive</option></select></label>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:px-5"><div><h3 className="font-bold">Students {className && <span className="font-medium text-slate-500">· {className}</span>}</h3><p className="mt-0.5 text-xs text-slate-500">{result.total} {result.total === 1 ? 'record' : 'records'}</p></div><label className="flex items-center gap-2 text-sm text-slate-500">Rows per page<select className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-ink" value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1) }}><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label></div>
      {loading ? <div className="flex items-center gap-2 px-5 py-12 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} />Loading students…</div> : error && !modal ? <p className="px-5 py-8 text-sm text-rose-700">{error}</p> : result.students.length === 0 ? <div className="px-5 py-14 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-teal/10 text-teal"><UserRound size={22} /></span><h3 className="mt-3 font-bold">No students found</h3><p className="mt-1 text-sm text-slate-500">Try changing the filters or add a student to get started.</p></div> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Roll No.', 'Student ID', 'Student Name', 'Class', 'Section', 'Parent Name', 'Parent Contact', 'Status', 'Actions'].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{result.students.map((student) => <tr key={student._id} className="hover:bg-slate-50/70"><td className="px-4 py-3 font-semibold">{student.rollNumber}</td><td className="px-4 py-3 text-slate-500">{student.studentId || '—'}</td><td className="px-4 py-3 font-semibold">{student.name}</td><td className="px-4 py-3">{student.classId?.name}</td><td className="px-4 py-3">{student.sectionId?.name}</td><td className="px-4 py-3">{student.parentName || '—'}</td><td className="px-4 py-3">{student.parentContact || '—'}</td><td className="px-4 py-3">{statusPill(student.status)}</td><td className="px-4 py-3">{studentActions(student)}</td></tr>)}</tbody></table></div>
        <div className="divide-y divide-slate-100 md:hidden">{result.students.map((student) => <article key={student._id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Roll {student.rollNumber}{student.studentId ? ` · ${student.studentId}` : ''}</p><h4 className="mt-1 truncate text-base font-bold">{student.name}</h4><p className="mt-1 text-sm text-slate-500">{student.classId?.name} · Section {student.sectionId?.name}</p></div>{statusPill(student.status)}</div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><p className="truncate text-slate-500">Parent: <span className="text-slate-700">{student.parentName || '—'}</span></p><p className="truncate text-slate-500">Contact: <span className="text-slate-700">{student.parentContact || '—'}</span></p></div><div className="mt-3">{studentActions(student)}</div></article>)}</div>
      </>}
      <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"><p className="text-xs text-slate-500">{result.total ? `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, result.total)} of ${result.total}` : 'Showing 0 students'}</p><nav aria-label="Student pages" className="flex flex-wrap items-center gap-1"><button disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold disabled:opacity-40">Previous</button>{visiblePages.map((number) => <button key={number} aria-current={number === page ? 'page' : undefined} onClick={() => setPage(number)} className={`min-h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold ${number === page ? 'border-teal bg-teal text-white' : 'border-slate-200 text-slate-600'}`}>{number}</button>)}<button disabled={page >= result.totalPages || loading} onClick={() => setPage((current) => current + 1)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold disabled:opacity-40">Next</button></nav></footer>
    </section>

    {modal?.type === 'form' && <Modal title={modal.student?._id ? 'Edit Student' : 'Add Student'} onClose={() => setModal(null)}><StudentForm key={modal.student?._id || 'new'} initial={modal.student || modal.defaults || emptyForm} classes={classes} onCancel={() => setModal(null)} onSave={saveStudent} saving={saving} error={error} /></Modal>}
    {modal?.type === 'import' && <Modal title="Import Students" onClose={() => !importBusy && setModal(null)} size="max-w-5xl"><div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Class *</span><select className={inputClass} value={importClassId} onChange={(event) => selectImportClass(event.target.value)}><option value="">Select class</option>{classes.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Section *</span><select className={inputClass} value={importSectionId} disabled={!importClassId} onChange={(event) => { setImportSectionId(event.target.value); setPreview(null) }}><option value="">Select section</option>{importSections.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label></div>
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-paper/60 p-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><FileSpreadsheet size={20} /></span><div><p className="text-sm font-semibold">Select a CSV or Excel workbook</p><p className="text-xs text-slate-500">Columns: Student ID, Roll Number, Student Name, Parent Name, Parent Contact</p></div></div><input aria-label="Choose CSV or Excel file" type="file" accept=".csv,.xlsx,.xls" disabled={!importClassId || !importSectionId || importBusy} onChange={(event) => event.target.files?.[0] && previewFile(event.target.files[0])} className="block w-full max-w-xs text-sm text-slate-600 file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-white file:px-3 file:text-sm file:font-semibold file:text-teal" /></div>
      <div className="flex flex-wrap gap-2"><button onClick={downloadTemplate} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Download Excel Template</button>{importFile && <span className="self-center truncate text-xs text-slate-500">{importFile.name}</span>}</div>
      {importBusy && <p className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={16} />{preview ? 'Importing students…' : 'Checking student rows…'}</p>}
      {importError && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{importError}</p>}
      {preview && <><div className="flex flex-wrap gap-3"><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">Valid records: {preview.validCount}</span><span className="rounded-full bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700">Invalid records: {preview.invalidCount}</span><span className="self-center text-sm text-slate-500">Detected {preview.total} student rows.</span></div><div className="max-h-72 overflow-auto rounded-xl border border-slate-200"><table className="w-full min-w-[650px] text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs text-slate-500"><tr>{['Row', 'Roll', 'Student ID', 'Name', 'Result'].map((item) => <th key={item} className="px-3 py-2.5">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{preview.rows.slice(0, 200).map((row) => <tr key={row.row} className={row.status === 'invalid' ? 'bg-rose-50/60' : ''}><td className="px-3 py-2">{row.row}</td><td className="px-3 py-2">{row.rollNumber || '—'}</td><td className="px-3 py-2">{row.studentId || '—'}</td><td className="px-3 py-2">{row.name || '—'}</td><td className="px-3 py-2"><span className={row.status === 'valid' ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>{row.status === 'valid' ? 'Valid' : row.errors.join(' ')}</span></td></tr>)}</tbody></table>{preview.rows.length > 200 && <p className="border-t px-3 py-2 text-xs text-slate-500">Showing first 200 rows in preview.</p>}</div></>}
      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between"><p className="self-center text-xs text-slate-500">Invalid rows are skipped. Valid rows will be rechecked before importing.</p><div className="flex flex-col-reverse gap-2 sm:flex-row"><button onClick={() => setModal(null)} disabled={importBusy} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600">Cancel</button><button onClick={commitImport} disabled={!preview?.validCount || importBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal px-4 text-sm font-semibold text-white disabled:opacity-50"><Upload size={16} /> Import Students</button></div></div>
    </div></Modal>}
    {confirmStudent && <Modal title="Deactivate Student?" onClose={() => setConfirmStudent(null)}><p className="text-sm leading-6 text-slate-600">Do you want to deactivate <strong className="text-slate-800">{confirmStudent.name}</strong>? The student record will be retained for historical information.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={() => setConfirmStudent(null)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600">Cancel</button><button onClick={deactivate} disabled={saving} className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white disabled:opacity-60">Deactivate</button></div></Modal>}
    {transferStudent && <Modal title={`Transfer ${transferStudent.name}`} onClose={() => !transferBusy && setTransferStudent(null)}><div className="space-y-4"><p className="text-sm text-slate-600">Current placement: <strong>{transferStudent.classId?.name} · Section {transferStudent.sectionId?.name}</strong></p><label className="block text-sm font-semibold text-slate-700">New Class<select className="form-input mt-1.5" value={transferForm.classId} onChange={(event) => loadTransferSections(event.target.value)}><option value="">Select class</option>{classes.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><label className="block text-sm font-semibold text-slate-700">New Section<select className="form-input mt-1.5" value={transferForm.sectionId} disabled={!transferForm.classId} onChange={(event) => setTransferForm({ ...transferForm, sectionId: event.target.value })}><option value="">Select section</option>{transferSections.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><label className="block text-sm font-semibold text-slate-700">Effective Date<input type="date" max={todayDateInput} className="form-input mt-1.5" value={transferForm.effectiveDate} onChange={(event) => setTransferForm({ ...transferForm, effectiveDate: event.target.value })} /></label><p className="text-xs text-slate-500">Transfers take effect on or before today so the current roster stays accurate.</p>{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" disabled={transferBusy} onClick={() => setTransferStudent(null)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold">Cancel</button><button type="button" disabled={transferBusy} onClick={submitTransfer} className="min-h-11 rounded-xl bg-teal px-4 text-sm font-bold text-white disabled:opacity-60">{transferBusy ? 'Transferring…' : 'Transfer Student'}</button></div></div></Modal>}
    {historyStudent && <Modal title={`Enrollment History · ${historyStudent.name}`} onClose={() => setHistoryStudent(null)}><ol className="space-y-3">{enrollmentHistory.map((entry, index) => <li key={entry._id || index} className="rounded-xl border border-slate-100 p-4"><p className="font-bold">{entry.classId?.name || 'Class'} · Section {entry.sectionId?.name || '—'}</p><p className="mt-1 text-sm text-slate-500">{new Date(entry.startDate).toLocaleDateString()} – {entry.endDate ? new Date(entry.endDate).toLocaleDateString() : 'Present'}</p><p className="mt-1 text-xs text-slate-500">Name: {entry.studentName} · Roll: {entry.rollNumber}{entry.academicYearId?.name ? ` · ${entry.academicYearId.name}` : ''}</p>{entry.legacy && <p className="mt-1 text-xs text-amber-700">Original placement preserved from the existing student record.</p>}</li>)}</ol></Modal>}
  </div>
}
