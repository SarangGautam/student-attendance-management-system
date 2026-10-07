import { useEffect, useState } from 'react'
import { BookOpenCheck, Building2, FileText, KeyRound, LoaderCircle, Save, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { apiRequest } from '../services/api.js'
import { normalizeTeacherName, validateTeacherName } from '../utils/teacherValidation.js'

const input = 'form-input'
const defaults = { name: '', email: '', schoolName: '', designation: '', schoolAddress: '', schoolPhone: '', reportFooter: '', showStudentId: true, showRollNumber: true, showAttendancePercentage: true }

function SectionCard({ icon: Icon, title, description, children }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"><div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-6"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal"><Icon size={19}/></span><div><h3 className="font-extrabold">{title}</h3><p className="mt-0.5 text-sm text-slate-500">{description}</p></div></div><div className="p-4 sm:p-6">{children}</div></section>
}

function TextField({ label, value, onChange, error, errorId, ...props }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span><input className={`${input} ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`} value={value} onChange={onChange} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} {...props}/>{error && <span id={errorId} className="mt-1.5 block text-sm text-rose-700">{error}</span>}</label>
}

function Preference({ label, description, checked, onChange }) {
  return <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 px-3 py-2.5"><span className="min-w-0"><span className="block text-sm font-semibold text-slate-700">{label}</span><span className="block text-xs text-slate-500">{description}</span></span><input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 shrink-0 accent-teal"/></label>
}

export default function SettingsPage() {
  const { updateUser } = useAuth()
  const [form, setForm] = useState(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [profileNameError, setProfileNameError] = useState('')
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    let active = true
    apiRequest('/api/settings').then(({ data }) => { if (active) setForm({ ...defaults, ...data }) })
      .catch((error) => { if (active) setLoadError(error.message || 'Unable to load settings.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setSaveMessage(''); setSaveError('')
    if (field === 'name') setProfileNameError(value.trim() ? validateTeacherName(value) : 'Teacher name is required.')
  }

  async function saveSettings(event) {
    event.preventDefault()
    if (saving) return
    const normalizedName = normalizeTeacherName(form.name)
    const nameError = normalizedName ? validateTeacherName(normalizedName) : 'Teacher name is required.'
    setProfileNameError(nameError)
    if (nameError) return
    setSaving(true); setSaveMessage(''); setSaveError('')
    try {
      const { data } = await apiRequest('/api/settings', { method: 'PUT', body: JSON.stringify({ ...form, name: normalizedName }) })
      setForm({ ...defaults, ...data })
      updateUser({ name: data.name, email: data.email })
      setSaveMessage('Saved successfully.')
    } catch (error) {
      if (error.errors?.name) setProfileNameError(error.errors.name)
      setSaveError(error.message || 'Error saving settings.')
    }
    finally { setSaving(false) }
  }

  async function changePassword(event) {
    event.preventDefault()
    if (passwordSaving) return
    setPasswordMessage(''); setPasswordError('')
    if (!password.currentPassword || !password.newPassword || !password.confirmPassword) { setPasswordError('Please fill in all password fields.'); return }
    if (password.newPassword.length < 6) { setPasswordError('New password must be at least 6 characters.'); return }
    if (password.newPassword !== password.confirmPassword) { setPasswordError('New password confirmation does not match.'); return }
    setPasswordSaving(true)
    try {
      const result = await apiRequest('/api/settings/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: password.currentPassword, newPassword: password.newPassword }) })
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordMessage(result.message || 'Password changed successfully.')
    } catch (error) { setPasswordError(error.message || 'Unable to change password. Please try again.') }
    finally { setPasswordSaving(false) }
  }

  return <div className="min-w-0 space-y-5">
    <div className="mb-2 flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal/10 text-teal"><BookOpenCheck size={23}/></span><div><p className="text-sm font-semibold text-teal">Your workspace</p><h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Settings</h2><p className="mt-1 text-sm text-slate-500">Manage your profile, school details, and report preferences.</p></div></div>
    {loadError && <div role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</div>}
    {loading ? <div className="flex min-h-48 items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white text-sm font-semibold text-slate-500"><LoaderCircle size={18} className="animate-spin"/>Loading settings…</div> : <form onSubmit={saveSettings} className="space-y-5">
      <SectionCard icon={UserRound} title="Profile" description="Your teacher account identity.">
        <div className="grid gap-4 sm:grid-cols-2"><TextField label="Teacher Name" value={form.name} onChange={(e) => change('name', e.target.value)} onBlur={() => setProfileNameError(form.name.trim() ? validateTeacherName(form.name) : 'Teacher name is required.')} error={profileNameError} errorId="settings-name-error" required maxLength={100}/><TextField label="Email" value={form.email} readOnly aria-readonly="true" className={`${input} cursor-not-allowed bg-slate-50 text-slate-500`}/></div>
        <p className="mt-2 text-xs text-slate-500">Email is managed by your sign-in account and cannot be changed here.</p>
      </SectionCard>
      <SectionCard icon={Building2} title="School Information" description="Optional details saved privately to your teacher account.">
        <div className="grid gap-4 sm:grid-cols-2"><TextField label="School Name" value={form.schoolName} onChange={(e) => change('schoolName', e.target.value)} maxLength={160} placeholder="ABC Public School"/><TextField label="Teacher Designation" value={form.designation} onChange={(e) => change('designation', e.target.value)} maxLength={100} placeholder="Class Teacher"/><TextField label="School Phone" value={form.schoolPhone} onChange={(e) => change('schoolPhone', e.target.value)} maxLength={40} inputMode="tel" placeholder="+91…"/><label className="block min-w-0 sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-slate-700">School Address</span><textarea className={`${input} min-h-24 resize-y py-3`} value={form.schoolAddress} onChange={(e) => change('schoolAddress', e.target.value)} maxLength={500} placeholder="School address"/></label></div>
      </SectionCard>
      <SectionCard icon={FileText} title="Report Preferences" description="Choose the school details and fields included in future exports.">
        <div className="grid gap-4 sm:grid-cols-2"><TextField label="School Name for Reports" value={form.schoolName} onChange={(e) => change('schoolName', e.target.value)} maxLength={160} placeholder="ABC Public School"/><TextField label="Report Footer Text" value={form.reportFooter} onChange={(e) => change('reportFooter', e.target.value)} maxLength={200} placeholder="Optional footer text"/></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><Preference label="Student ID" description="Include student IDs in exports" checked={form.showStudentId} onChange={(e) => change('showStudentId', e.target.checked)}/><Preference label="Roll Number" description="Include roll numbers in exports" checked={form.showRollNumber} onChange={(e) => change('showRollNumber', e.target.checked)}/><Preference label="Attendance Percentage" description="Include percentages in exports" checked={form.showAttendancePercentage} onChange={(e) => change('showAttendancePercentage', e.target.checked)}/></div>
      </SectionCard>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">{saveMessage ? <p role="status" className="text-sm font-semibold text-emerald-700">{saveMessage}</p> : saveError ? <p role="alert" className="text-sm font-semibold text-rose-700">{saveError}</p> : <span className="text-sm text-slate-500">Settings apply to your account and future reports.</span>}<button disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal px-5 text-sm font-bold text-white shadow-sm hover:bg-teal/90 disabled:cursor-wait disabled:opacity-60 sm:w-auto">{saving ? <><LoaderCircle size={17} className="animate-spin"/>Saving...</> : <><Save size={17}/>Save Settings</>}</button></div>
    </form>}
    <SectionCard icon={KeyRound} title="Password & Security" description="Confirm your current password to choose a new one.">
      <form onSubmit={changePassword} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><TextField type="password" autoComplete="current-password" label="Current Password" value={password.currentPassword} onChange={(e) => { setPassword((current) => ({ ...current, currentPassword: e.target.value })); setPasswordMessage(''); setPasswordError('') }}/><span className="hidden sm:block"/><TextField type="password" autoComplete="new-password" label="New Password" value={password.newPassword} onChange={(e) => { setPassword((current) => ({ ...current, newPassword: e.target.value })); setPasswordMessage(''); setPasswordError('') }} minLength={6}/><TextField type="password" autoComplete="new-password" label="Confirm New Password" value={password.confirmPassword} onChange={(e) => { setPassword((current) => ({ ...current, confirmPassword: e.target.value })); setPasswordMessage(''); setPasswordError('') }} minLength={6}/></div>{(passwordMessage || passwordError) && <p role={passwordError ? 'alert' : 'status'} className={`rounded-xl px-3 py-2 text-sm ${passwordError ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{passwordError || passwordMessage}</p>}<div className="flex justify-end"><button disabled={passwordSaving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-ink bg-ink px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60 sm:w-auto">{passwordSaving ? <><LoaderCircle size={17} className="animate-spin"/>Updating...</> : <><KeyRound size={17}/>Change Password</>}</button></div></form>
    </SectionCard>
  </div>
}
