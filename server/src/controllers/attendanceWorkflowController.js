import mongoose from 'mongoose'
import Attendance from '../models/Attendance.js'
import AttendanceAudit from '../models/AttendanceAudit.js'
import AttendanceDraft from '../models/AttendanceDraft.js'
import Class from '../models/Class.js'
import Holiday from '../models/Holiday.js'
import Section from '../models/Section.js'
import Student from '../models/Student.js'

const validId = mongoose.isValidObjectId
function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value ? date : null
}
function todayLocal() {
  const current = new Date()
  const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
  return parseDate(key)
}
async function ownedSection(sectionId, teacherId) {
  if (!validId(sectionId)) return { error: 'Invalid section ID.', code: 400 }
  const section = await Section.findOne({ _id: sectionId, teacherId }).select('name classId')
  if (!section) return { error: 'Section not found.', code: 404 }
  const classRecord = await Class.findOne({ _id: section.classId, teacherId }).select('name')
  return classRecord ? { section, classRecord } : { error: 'Class not found.', code: 404 }
}

export async function getAttendanceDraft(req, res) {
  const { sectionId, date: value } = req.query
  const date = parseDate(value)
  if (!date) return res.status(400).json({ success: false, message: 'Choose a valid date.' })
  const result = await ownedSection(sectionId, req.user._id)
  if (result.error) return res.status(result.code).json({ success: false, message: result.error })
  const [draft, attendance] = await Promise.all([
    AttendanceDraft.findOne({ teacherId: req.user._id, sectionId, date }).select('-teacherId -__v').lean(),
    Attendance.exists({ teacherId: req.user._id, sectionId, date }),
  ])
  return res.json({ success: true, data: { draft, finalized: Boolean(attendance) } })
}

export async function saveAttendanceDraft(req, res) {
  const { sectionId } = req.body || {}
  const date = parseDate(req.body?.date)
  if (!date) return res.status(400).json({ success: false, message: 'Choose a valid date.' })
  if (date > todayLocal()) return res.status(400).json({ success: false, message: 'Attendance cannot be marked for a future date.' })
  const placement = await ownedSection(sectionId, req.user._id)
  if (placement.error) return res.status(placement.code).json({ success: false, message: placement.error })
  if (await Holiday.exists({ teacherId: req.user._id, date })) return res.status(409).json({ success: false, message: 'Attendance drafts are not available for holidays.' })
  if (await Attendance.exists({ teacherId: req.user._id, sectionId, date })) return res.status(409).json({ success: false, message: 'Finalized attendance already exists for this date.' })
  if (!Array.isArray(req.body.records)) return res.status(400).json({ success: false, message: 'Draft records are required.' })
  const roster = await Student.find({ teacherId: req.user._id, sectionId, status: 'active' }).select('_id').lean()
  const validStudents = new Set(roster.map((student) => String(student._id)))
  const seen = new Set()
  const records = []
  for (const row of req.body.records) {
    const studentId = String(row?.studentId || '')
    if (!validId(studentId) || !validStudents.has(studentId) || seen.has(studentId) || !['present', 'absent', ''].includes(row.status)) return res.status(400).json({ success: false, message: 'Draft contains an invalid student or attendance status.' })
    seen.add(studentId)
    records.push({ studentId, status: row.status })
  }
  if (records.length !== roster.length) return res.status(400).json({ success: false, message: 'Draft must include all active students in the section.' })
  const key = { teacherId: req.user._id, sectionId, date }
  const draft = await AttendanceDraft.findOneAndUpdate(key, { $set: { records, updatedByName: req.user.name || '' } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }).select('-teacherId -__v').lean()
  return res.json({ success: true, data: draft })
}

export async function discardAttendanceDraft(req, res) {
  const { sectionId, date: value } = req.query
  const date = parseDate(value)
  if (!date) return res.status(400).json({ success: false, message: 'Choose a valid date.' })
  const placement = await ownedSection(sectionId, req.user._id)
  if (placement.error) return res.status(placement.code).json({ success: false, message: placement.error })
  await AttendanceDraft.deleteOne({ teacherId: req.user._id, sectionId, date })
  return res.json({ success: true, message: 'Attendance draft discarded.' })
}

export async function lockAttendance(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid attendance ID.' })
  const attendance = await Attendance.findOne({ _id: req.params.id, teacherId: req.user._id })
  if (!attendance) return res.status(404).json({ success: false, message: 'Attendance record not found.' })
  if (attendance.lockedAt) return res.status(409).json({ success: false, message: 'Attendance for this date is already locked.' })
  attendance.lockedAt = new Date()
  attendance.lockedByName = req.user.name || ''
  await attendance.save()
  return res.json({ success: true, message: 'Attendance locked successfully.', data: { lockedAt: attendance.lockedAt, lockedByName: attendance.lockedByName } })
}

export async function listAttendanceHistory(req, res) {
  const filter = { teacherId: req.user._id }
  if (req.query.date) {
    const date = parseDate(req.query.date)
    if (!date) return res.status(400).json({ success: false, message: 'Choose a valid date.' })
    filter.date = date
  }
  for (const field of ['studentId', 'sectionId']) if (req.query[field]) {
    if (!validId(req.query[field])) return res.status(400).json({ success: false, message: `Invalid ${field === 'studentId' ? 'student' : 'section'} ID.` })
    if (field === 'studentId' && !await Student.exists({ _id: req.query[field], teacherId: req.user._id })) return res.status(404).json({ success: false, message: 'Student not found.' })
    if (field === 'sectionId' && !await Section.exists({ _id: req.query[field], teacherId: req.user._id })) return res.status(404).json({ success: false, message: 'Section not found.' })
    filter[field] = req.query[field]
  }
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50))
  const [items, total] = await Promise.all([
    AttendanceAudit.find(filter).sort({ changedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).select('-teacherId -__v').lean(),
    AttendanceAudit.countDocuments(filter),
  ])
  return res.json({ success: true, data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } })
}
