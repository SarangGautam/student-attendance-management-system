import { useEffect, useState } from 'react'
import { CalendarRange, Check, LoaderCircle, Plus } from 'lucide-react'
import { apiRequest } from '../services/api.js'

const blank = { name: '', startDate: '', endDate: '', isActive: true }
export default function AcademicYearsPage() {
  const [years, setYears] = useState([])
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function load() { setLoading(true); try { const { data } = await apiRequest('/api/academic-years'); setYears(data) } catch (e) { setError(e.message) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  function beginEdit(year) { setEditing(year._id); setForm({ name: year.name, startDate: year.startDate.slice(0, 10), endDate: year.endDate.slice(0, 10), isActive: year.isActive }); setNotice('') }
  function clearForm() { setEditing(''); setForm(blank); setError('') }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    try {
      await apiRequest(editing ? `/api/academic-years/${editing}` : '/api/academic-years', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(form) })
      setNotice(editing ? 'Academic year updated.' : 'Academic year created.')
      clearForm(); await load(); window.dispatchEvent(new Event('academic-year-updated'))
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  async function activate(year) {
    setSaving(true); setError(''); setNotice('')
    try { await apiRequest(`/api/academic-years/${year._id}/activate`, { method: 'POST' }); setNotice(`${year.name} is now active.`); await load(); window.dispatchEvent(new Event('academic-year-updated')) }
    catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  return <div className="mx-auto max-w-5xl">
    <div className="mb-6 flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal/10 text-teal"><CalendarRange size={23} /></span><div><p className="text-sm font-semibold text-teal">School calendar</p><h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Academic Years</h2><p className="mt-1 text-sm text-slate-500">Create school years and choose the year for new class and student records.</p></div></div>
    {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}{error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <form onSubmit={submit} className="h-fit rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><h3 className="font-bold">{editing ? 'Edit Academic Year' : 'Create Academic Year'}</h3><div className="mt-4 space-y-4"><label className="block text-sm font-semibold text-slate-700">Name<input required maxLength={30} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="2026–27" className="form-input mt-1.5" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700">Start date<input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="form-input mt-1.5" /></label><label className="block text-sm font-semibold text-slate-700">End date<input required type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="form-input mt-1.5" /></label></div><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-slate-300 text-teal focus:ring-teal" />Set as active academic year</label><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{editing && <button type="button" onClick={clearForm} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold">Cancel</button>}<button disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal px-4 text-sm font-bold text-white disabled:opacity-60">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Year'}</button></div></div></form>
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><h3 className="font-bold">Your Academic Years</h3><p className="mt-1 text-sm text-slate-500">Existing records without a year remain available.</p>{loading ? <p className="mt-5 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={16} />Loading academic years…</p> : years.length ? <ul className="mt-4 divide-y divide-slate-100">{years.map((year) => <li key={year._id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{year.name}</p>{year.isActive && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><Check className="mr-1 inline" size={13} />Active</span>}</div><p className="mt-1 text-xs text-slate-500">{new Date(year.startDate).toLocaleDateString()} – {new Date(year.endDate).toLocaleDateString()}</p></div><div className="flex gap-2"><button type="button" onClick={() => beginEdit(year)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600">Edit</button>{!year.isActive && <button type="button" disabled={saving} onClick={() => activate(year)} className="min-h-10 rounded-lg bg-teal px-3 text-sm font-semibold text-white disabled:opacity-60">Set Active</button>}</div></li>)}</ul> : <div className="mt-5 rounded-xl bg-paper p-5 text-sm text-slate-500">No academic years yet. Create the first year to start organizing new records.</div>}</section>
    </div>
  </div>
}
