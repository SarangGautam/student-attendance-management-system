import bcrypt from 'bcryptjs'
import Teacher from '../models/Teacher.js'
import { EMAIL_ERROR, isValidTeacherEmail, isValidTeacherName, normalizeTeacherEmail, normalizeTeacherName, TEACHER_NAME_ERROR } from '../utils/teacherValidation.js'

const settingsFields = ['schoolName', 'designation', 'schoolAddress', 'schoolPhone', 'reportFooter']
const preferenceFields = ['showStudentId', 'showRollNumber', 'showAttendancePercentage']

function settingsPayload(teacher) {
  return {
    name: teacher.name,
    email: teacher.email,
    schoolName: teacher.schoolName || '',
    designation: teacher.designation || '',
    schoolAddress: teacher.schoolAddress || '',
    schoolPhone: teacher.schoolPhone || '',
    reportFooter: teacher.reportFooter || '',
    showStudentId: teacher.showStudentId ?? true,
    showRollNumber: teacher.showRollNumber ?? true,
    showAttendancePercentage: teacher.showAttendancePercentage ?? true,
  }
}

function validPhone(value) {
  return !value || /^[+()\-\s\d.]{5,40}$/.test(value)
}

export async function getSettings(req, res) {
  const teacher = await Teacher.findById(req.user._id)
  if (!teacher) return res.status(401).json({ success: false, message: 'Unauthorized' })
  return res.json({ success: true, data: settingsPayload(teacher) })
}

export async function updateSettings(req, res) {
  const body = req.body || {}
  const name = normalizeTeacherName(body.name)
  const errors = {}
  if (!name || !isValidTeacherName(name)) errors.name = name ? TEACHER_NAME_ERROR : 'Teacher name is required.'
  const submittedEmail = body.email === undefined ? undefined : normalizeTeacherEmail(body.email)
  if (submittedEmail !== undefined && !isValidTeacherEmail(submittedEmail)) errors.email = EMAIL_ERROR
  if (Object.keys(errors).length) return res.status(400).json({ success: false, message: 'Validation failed', errors })

  if (submittedEmail !== undefined) {
    const currentTeacher = await Teacher.findById(req.user._id).select('email')
    if (!currentTeacher) return res.status(401).json({ success: false, message: 'Unauthorized' })
    if (submittedEmail !== currentTeacher.email) {
      return res.status(400).json({ success: false, message: 'Email cannot be changed here.' })
    }
  }

  const update = { name }
  for (const field of settingsFields) {
    if (body[field] === undefined) continue
    if (typeof body[field] !== 'string') return res.status(400).json({ success: false, message: 'Please check the school and report fields.' })
    const value = body[field].trim()
    const max = field === 'schoolAddress' ? 500 : field === 'reportFooter' ? 200 : field === 'designation' ? 100 : 160
    if (value.length > max) return res.status(400).json({ success: false, message: `${field} is too long.` })
    update[field] = value
  }
  if (update.schoolPhone !== undefined && !validPhone(update.schoolPhone)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid school phone number.' })
  }
  for (const field of preferenceFields) {
    if (body[field] === undefined) continue
    if (typeof body[field] !== 'boolean') return res.status(400).json({ success: false, message: 'Report preferences must be enabled or disabled.' })
    update[field] = body[field]
  }

  const teacher = await Teacher.findByIdAndUpdate(req.user._id, { $set: update }, { new: true, runValidators: true })
  if (!teacher) return res.status(401).json({ success: false, message: 'Unauthorized' })
  return res.json({ success: true, message: 'Settings saved successfully.', data: settingsPayload(teacher) })
}

export async function changePassword(req, res) {
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : ''
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : ''
  if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Please fill in all password fields.' })
  if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' })
  if (currentPassword === newPassword) return res.status(400).json({ success: false, message: 'Choose a new password different from your current password.' })

  const teacher = await Teacher.findById(req.user._id).select('+password')
  if (!teacher) return res.status(401).json({ success: false, message: 'Unauthorized' })
  if (!(await bcrypt.compare(currentPassword, teacher.password))) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect.' })
  }
  teacher.password = newPassword
  await teacher.save()
  return res.json({ success: true, message: 'Password changed successfully.' })
}
