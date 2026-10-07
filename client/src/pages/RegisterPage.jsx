import { useState } from 'react'
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { normalizeTeacherEmail, normalizeTeacherName, validateTeacherEmail, validateTeacherName } from '../utils/teacherValidation.js'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field === 'name' && touched.name) setFieldErrors((current) => ({ ...current, name: validateTeacherName(value) }))
    if (field === 'email' && touched.email) setFieldErrors((current) => ({ ...current, email: validateTeacherEmail(value) }))
    setError('')
  }

  function validateFields() {
    const next = {}
    if (!values.name.trim()) next.name = 'Teacher name is required.'
    else if (validateTeacherName(values.name)) next.name = validateTeacherName(values.name)
    if (!values.email.trim()) next.email = 'Email is required.'
    else if (validateTeacherEmail(values.email)) next.email = validateTeacherEmail(values.email)
    setTouched({ name: true, email: true })
    setFieldErrors(next)
    return next
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!values.name.trim() || !values.email.trim() || !values.password || !values.confirmPassword) setError('Please fill in all required fields.')
    const validationErrors = validateFields()
    if (Object.keys(validationErrors).length) return
    if (!values.password || !values.confirmPassword) return
    if (values.password.length < 6) return setError('Password must be at least 6 characters.')
    if (values.password !== values.confirmPassword) return setError('Passwords do not match.')

    setLoading(true)
    try {
      await register({ name: normalizeTeacherName(values.name), email: normalizeTeacherEmail(values.email), password: values.password })
      navigate('/login', { replace: true, state: { success: 'Your account was created. You can now log in.' } })
    } catch (requestError) {
      if (requestError.errors && Object.keys(requestError.errors).length) setFieldErrors((current) => ({ ...current, ...requestError.errors }))
      setError(requestError.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout eyebrow="Get started" title="Create your account" description="Set up your teacher account to continue to your workspace.">
      <form className="space-y-4" onSubmit={submit} noValidate>
        <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Teacher Name</span><span className="relative block"><UserRound size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input autoComplete="name" value={values.name} onChange={(event) => update('name', event.target.value)} onBlur={() => { setTouched((current) => ({ ...current, name: true })); setFieldErrors((current) => ({ ...current, name: values.name.trim() ? validateTeacherName(values.name) : 'Teacher name is required.' })) }} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'register-name-error' : undefined} placeholder="Your full name" className={`form-input pl-11 ${fieldErrors.name ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`} /></span>{fieldErrors.name && <span id="register-name-error" className="mt-1.5 block text-sm text-rose-700">{fieldErrors.name}</span>}</label>
        <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Email</span><span className="relative block"><Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input autoComplete="email" type="email" value={values.email} onChange={(event) => update('email', event.target.value)} onBlur={() => { setTouched((current) => ({ ...current, email: true })); setFieldErrors((current) => ({ ...current, email: values.email.trim() ? validateTeacherEmail(values.email) : 'Email is required.' })) }} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'register-email-error' : undefined} placeholder="you@school.edu" className={`form-input pl-11 ${fieldErrors.email ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`} />{fieldErrors.email && <span id="register-email-error" className="mt-1.5 block text-sm text-rose-700">{fieldErrors.email}</span>}</span></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Password</span><span className="relative block"><LockKeyhole size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={values.password} onChange={(event) => update('password', event.target.value)} placeholder="At least 6 characters" className="form-input pl-11 pr-12" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password</span><span className="relative block"><LockKeyhole size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={values.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} placeholder="Re-enter your password" className="form-input pl-11" /></span></label>
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-5 text-rose-700">{error}</div>}
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-ink/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70">{loading && <LoaderCircle size={17} className="animate-spin" />}{loading ? 'Creating account…' : 'Create Account'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="font-bold text-teal hover:text-teal/80">Log in</Link></p>
    </AuthLayout>
  )
}
