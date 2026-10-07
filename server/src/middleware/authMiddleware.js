import jwt from 'jsonwebtoken'
import Teacher from '../models/Teacher.js'
import AuthSession from '../models/AuthSession.js'
import { DATABASE_SETUP_MESSAGE, isDatabaseConnected } from '../config/database.js'

export default async function authMiddleware(req, res, next) {
  if (!isDatabaseConnected()) {
    return res.status(503).json({ success: false, code: 'DATABASE_NOT_CONFIGURED', message: DATABASE_SETUP_MESSAGE })
  }
  const token = req.cookies?.teacherToken
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' })
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ success: false, message: 'JWT_SECRET is not configured. Add JWT_SECRET to server/.env.' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (typeof payload.jti !== 'string' || !payload.sub) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }
    const session = await AuthSession.findOne({
      sessionId: payload.jti,
      teacherId: payload.sub,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
    if (!session) return res.status(401).json({ success: false, message: 'Unauthorized' })
    const teacher = await Teacher.findById(payload.sub)
    if (!teacher) return res.status(401).json({ success: false, message: 'Unauthorized' })
    req.user = teacher
    req.authSession = session
    return next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }
    console.error('[auth/middleware]', error)
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' })
  }
}
