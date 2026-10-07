import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import Teacher from '../models/Teacher.js'
import AuthSession from '../models/AuthSession.js'
import { DATABASE_SETUP_MESSAGE, isDatabaseConnected } from '../config/database.js'
import { EMAIL_ERROR, isValidTeacherEmail, isValidTeacherName, normalizeTeacherEmail, normalizeTeacherName, TEACHER_NAME_ERROR } from '../utils/teacherValidation.js'

const COOKIE_NAME = 'teacherToken'
const TOKEN_LIFETIME = '7d'

function authCookieOptions(rememberMe = true) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(rememberMe ? { maxAge: 7 * 24 * 60 * 60 * 1000 } : {}),
  }
}

function createToken(teacherId, sessionId) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured. Add JWT_SECRET to server/.env.')
  return jwt.sign({ sub: teacherId, jti: sessionId }, secret, { expiresIn: TOKEN_LIFETIME })
}

function publicTeacher(teacher) {
  return {
    id: teacher._id.toString(),
    name: teacher.name,
    email: teacher.email,
    role: teacher.role,
    createdAt: teacher.createdAt,
  }
}

function ensureDatabase(res) {
  if (isDatabaseConnected()) return true
  res.status(503).json({ success: false, code: 'DATABASE_NOT_CONFIGURED', message: DATABASE_SETUP_MESSAGE })
  return false
}

export async function register(req, res) {
  if (!ensureDatabase(res)) return
  const body = req.body || {}
  const name = normalizeTeacherName(body.name)
  const email = normalizeTeacherEmail(body.email)
  const password = typeof body.password === 'string' ? body.password : ''

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please fill in all required fields.' })
  }
  const errors = {}
  if (!isValidTeacherName(name)) errors.name = TEACHER_NAME_ERROR
  if (!isValidTeacherEmail(email)) errors.email = EMAIL_ERROR
  if (Object.keys(errors).length) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors })
  }
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' })

  try {
    if (await Teacher.exists({ email })) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' })
    }
    const teacher = await Teacher.create({ name, email, password })
    return res.status(201).json({ success: true, message: 'Account created successfully.', user: publicTeacher(teacher) })
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' })
    }
    console.error('[auth/register]', error)
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' })
  }
}

export async function login(req, res) {
  if (!ensureDatabase(res)) return
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ success: false, message: 'JWT_SECRET is not configured. Add JWT_SECRET to server/.env.' })
  }
  const body = req.body || {}
  const email = normalizeTeacherEmail(body.email)
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || !password) return res.status(400).json({ success: false, message: 'Please fill in all required fields.' })
  if (!isValidTeacherEmail(email)) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: { email: EMAIL_ERROR } })
  }

  try {
    const teacher = await Teacher.findOne({ email }).select('+password')
    if (!teacher || !(await bcrypt.compare(password, teacher.password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' })
    }
    const sessionId = randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await AuthSession.create({ sessionId, teacherId: teacher._id, expiresAt })
    const token = createToken(teacher._id.toString(), sessionId)
    res.cookie(COOKIE_NAME, token, authCookieOptions(Boolean(body.rememberMe)))
    return res.json({ success: true, user: publicTeacher(teacher) })
  } catch (error) {
    console.error('[auth/login]', error)
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' })
  }
}

export async function me(req, res) {
  return res.json({ success: true, user: publicTeacher(req.user) })
}

export async function logout(req, res) {
  const token = req.cookies?.[COOKIE_NAME]
  if (token && process.env.JWT_SECRET) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      if (typeof payload.jti === 'string' && payload.sub) {
        await AuthSession.findOneAndUpdate(
          { sessionId: payload.jti, teacherId: payload.sub, revokedAt: null },
          { $set: { revokedAt: new Date() } },
        )
      }
    } catch (error) {
      if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
        console.error('[auth/logout]', error)
      }
    }
  }
  res.clearCookie(COOKIE_NAME, authCookieOptions(false))
  return res.json({ success: true, message: 'Logged out successfully.' })
}
