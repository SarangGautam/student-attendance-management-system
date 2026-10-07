import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, GraduationCap, LoaderCircle, Pencil, Plus, Trash2, UsersRound, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../services/api.js'

const inputClass = 'form-input'

function Dialog({ title, children, onClose }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
      <div className="mb-5 flex items-center justify-between"><h2 id="dialog-title" className="text-xl font-bold">{title}</h2><button onClick={onClose} aria-label="Close dialog" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={19} /></button></div>{children}
    </section>
  </div>
}

export default function ClassesPage() {
  const [classes, setClasses] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [sections, setSections] = useState([])
  const [busy, setBusy] = useState(true)
  const [sectionBusy, setSectionBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialog, setDialog] = useState(null)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const selectedClass = useMemo(() => classes.find((item) => item._id === selectedId), [classes, selectedId])

  async function loadClasses(preferredId = selectedId) {
    const result = await apiRequest('/api/classes')
    setClasses(result.data)
    const nextSelected = result.data.some((item) => item._id === preferredId) ? preferredId : ''
    setSelectedId(nextSelected)
    if (nextSelected) await loadSections(nextSelected)
    else setSections([])
  }

  async function loadSections(classId) {
    setSectionBusy(true)
    try {
      const result = await apiRequest(`/api/sections?classId=${encodeURIComponent(classId)}`)
      setSections(result.data)
    } finally { setSectionBusy(false) }
  }

  useEffect(() => {
    loadClasses('').catch((requestError) => setError(requestError.message)).finally(() => setBusy(false))
  }, [])

  function openDialog(type, item = null) {
    setError('')
    setValue(item?.name || '')
    setDialog({ type, item })
  }

  async function submit(event) {
    event.preventDefault()
    const name = value.trim()
    if (!name) { setError(dialog.type.includes('section') ? 'Please enter a section name.' : 'Please enter a class name.'); return }
    setSaving(true); setError(''); setNotice('')
    try {
      if (dialog.type === 'class-add') {
        await apiRequest('/api/classes', { method: 'POST', body: JSON.stringify({ name }) })
        setNotice('Class created successfully.')
        await loadClasses()
      } else if (dialog.type === 'class-edit') {
        await apiRequest(`/api/classes/${dialog.item._id}`, { method: 'PUT', body: JSON.stringify({ name }) })
        setNotice('Class updated successfully.')
        await loadClasses()
      } else if (dialog.type === 'section-add') {
        await apiRequest('/api/sections', { method: 'POST', body: JSON.stringify({ classId: selectedId, name }) })
        setNotice('Section created successfully.')
        await loadClasses(selectedId)
      } else {
        await apiRequest(`/api/sections/${dialog.item._id}`, { method: 'PUT', body: JSON.stringify({ name }) })
        setNotice('Section updated successfully.')
        await loadClasses(selectedId)
      }
      setDialog(null)
    } catch (requestError) { setError(requestError.message) }
    finally { setSaving(false) }
  }

  async function removeClass(item) {
    if (!window.confirm(`Are you sure you want to delete ${item.name}?`)) return
    setError(''); setNotice('')
    try {
      await apiRequest(`/api/classes/${item._id}`, { method: 'DELETE' })
      setNotice('Class deleted successfully.')
      await loadClasses('')
    } catch (requestError) { setError(requestError.message) }
  }

  async function removeSection(item) {
    if (!window.confirm(`Are you sure you want to delete Section ${item.name}?`)) return
    setError(''); setNotice('')
    try {
      await apiRequest(`/api/sections/${item._id}`, { method: 'DELETE' })
      setNotice('Section deleted successfully.')
      await loadClasses(selectedId)
    } catch (requestError) { setError(requestError.message) }
  }

  return <div>
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-teal">Organize your teaching groups</p><h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Class &amp; Section Management</h2><p className="mt-2 text-sm text-slate-500">Create classes and arrange sections in one place.</p></div><button onClick={() => openDialog('class-add')} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal/90 sm:w-auto"><Plus size={18} /> Add Class</button></div>
    {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{notice}</div>}
    {error && !dialog && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}
    {busy ? <div className="flex items-center gap-2 py-16 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} />Loading classes…</div> : classes.length === 0 ? <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center shadow-sm"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal/10 text-teal"><GraduationCap size={27} /></span><h3 className="mt-4 text-lg font-bold">No classes created yet.</h3><p className="mt-1 text-sm text-slate-500">Create your first class to get started.</p><button onClick={() => openDialog('class-add')} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17} /> Add Class</button></section> : <>
      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">{classes.map((item) => <article key={item._id} className={`min-w-0 max-w-full rounded-2xl border bg-white p-5 shadow-[0_8px_30px_-20px_rgba(24,50,75,.3)] ${selectedId === item._id ? 'border-teal/50 ring-2 ring-teal/10' : 'border-slate-100'}`}><div className="flex min-w-0 items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal"><BookOpen size={20} /></span><div className="min-w-0"><h3 className="truncate text-lg font-bold">{item.name}</h3><p className="mt-0.5 text-sm text-slate-500">{item.sectionCount} {item.sectionCount === 1 ? 'Section' : 'Sections'}</p></div></div><span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Class</span></div><div className="mt-5 flex min-w-0 flex-wrap gap-2"><button onClick={() => { setSelectedId(item._id); loadSections(item._id).catch((e) => setError(e.message)) }} className="inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal/10 px-2 text-xs font-semibold text-teal hover:bg-teal/15 sm:px-3 sm:text-sm">{selectedId === item._id ? 'Viewing Sections' : 'View Sections'}{selectedId === item._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button><button aria-label={`Edit ${item.name}`} onClick={() => openDialog('class-edit', item)} className="grid min-h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><Pencil size={16} /></button><button aria-label={`Delete ${item.name}`} onClick={() => removeClass(item)} className="grid min-h-10 w-10 shrink-0 place-items-center rounded-xl border border-rose-100 text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button></div></article>)}</div>
      {selectedClass && <section className="mt-7 rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_-20px_rgba(24,50,75,.3)] sm:p-7"><div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-sm font-medium text-teal">Sections</p><h3 className="mt-1 text-2xl font-extrabold">{selectedClass.name}</h3></div><button onClick={() => openDialog('section-add')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal/20 bg-teal/5 px-4 py-2.5 text-sm font-semibold text-teal hover:bg-teal/10"><Plus size={17} /> Add Section</button></div>
        {sectionBusy ? <p className="py-8 text-sm text-slate-500">Loading sections…</p> : sections.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center"><UsersRound className="mx-auto text-slate-300" size={25} /><p className="mt-2 text-sm font-medium text-slate-600">No sections in this class yet.</p><p className="mt-1 text-xs text-slate-400">Add a section to organize this class.</p></div> : <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">{sections.map((section) => <article key={section._id} className="min-w-0 rounded-2xl border border-slate-100 bg-paper/70 p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h4 className="font-bold">Section {section.name}</h4><p className="mt-1 text-xs text-slate-500">Students: {section.studentCount || 0}</p></div><span className="shrink-0 rounded-lg bg-white p-2 text-teal"><UsersRound size={17} /></span></div><div className="mt-4 flex flex-wrap gap-2"><Link to={`/students?classId=${selectedClass._id}&sectionId=${section._id}`} className="inline-flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-xl bg-teal px-2 text-center text-xs font-semibold text-white hover:bg-teal/90 sm:px-3 sm:text-sm">View Students</Link><button onClick={() => openDialog('section-edit', section)} className="inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:px-3 sm:text-sm"><Pencil size={15} /> Edit</button><button onClick={() => removeSection(section)} className="inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-100 bg-white px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 sm:px-3 sm:text-sm"><Trash2 size={15} /> Delete</button></div></article>)}</div>}
      </section>}
    </>}
    {dialog && <Dialog title={dialog.type === 'class-add' ? 'Add New Class' : dialog.type === 'class-edit' ? 'Edit Class' : dialog.type === 'section-add' ? 'Add Section' : 'Edit Section'} onClose={() => !saving && setDialog(null)}><form onSubmit={submit}><label htmlFor="management-name" className="mb-2 block text-sm font-semibold text-slate-700">{dialog.type.includes('section') ? 'Section Name' : 'Class Name'}</label><input autoFocus id="management-name" className={inputClass} value={value} onChange={(event) => setValue(event.target.value)} placeholder={dialog.type.includes('section') ? 'A' : 'Class 6'} maxLength={80} />{dialog.type.includes('section') && <p className="mt-2 text-xs text-slate-500">Class: {selectedClass?.name}</p>}{error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={saving} onClick={() => setDialog(null)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600">Cancel</button><button disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal px-4 text-sm font-semibold text-white disabled:opacity-60">{saving && <LoaderCircle className="animate-spin" size={16} />}{dialog.type.endsWith('add') ? (dialog.type.includes('section') ? 'Add Section' : 'Add Class') : 'Save Changes'}</button></div></form></Dialog>}
  </div>
}
