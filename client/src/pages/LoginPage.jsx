import { useState } from 'react'
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { normalizeTeacherEmail, validateTeacherEmail } from '../utils/teacherValidation.js'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(location.state?.success || '')
  const [emailError, setEmailError] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [isSuccess, setIsSuccess] = useState(Boolean(location.state?.success))
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setIsSuccess(false)
    if (!email.trim() || !password) {
      setEmailError(email.trim() ? '' : 'Email is required.')
      return setError('Please fill in all required fields.')
    }
    const validationMessage = validateTeacherEmail(email)
    if (validationMessage) {
      setEmailError(validationMessage)
      return setError(validationMessage)
    }
    setLoading(true)
    try {
      await login({ email: normalizeTeacherEmail(email), password, rememberMe })
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout eyebrow="Teacher portal" title="Teacher Login" description="Welcome back. Sign in to open your attendance workspace.">
      <form className="space-y-5" onSubmit={submit} noValidate>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
          <span className="relative block"><Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input autoComplete="email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); if (emailTouched) setEmailError(validateTeacherEmail(event.target.value)) }} onBlur={() => { setEmailTouched(true); setEmailError(email.trim() ? validateTeacherEmail(email) : 'Email is required.') }} aria-invalid={Boolean(emailError)} aria-describedby={emailError ? 'login-email-error' : undefined} placeholder="you@school.edu" className={`form-input pl-11 ${emailError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`} />
          </span>
          {emailError && <span id="login-email-error" className="mt-1.5 block text-sm text-rose-700">{emailError}</span>}
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
          <span className="relative block"><LockKeyhole size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="form-input pl-11 pr-12" />
            <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </span>
        </label>

        <div className="flex items-center">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-teal focus:ring-teal" />Remember me</label>
        </div>

        {error && <div role={isSuccess ? 'status' : 'alert'} className={`rounded-xl border px-3.5 py-3 text-sm leading-5 ${isSuccess ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{error}</div>}

        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-ink/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70">
          {loading && <LoaderCircle size={17} className="animate-spin" />}{loading ? 'Signing in…' : 'Login'}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-500">Don't have an account? <Link to="/register" className="font-bold text-teal hover:text-teal/80">Create Account</Link></p>
    </AuthLayout>
  )
}
