import mongoose from 'mongoose'
import Attendance from '../models/Attendance.js'
import Class from '../models/Class.js'
import Holiday from '../models/Holiday.js'
import Section from '../models/Section.js'
import Student from '../models/Student.js'
import AttendanceDraft from '../models/AttendanceDraft.js'
import AttendanceAudit from '../models/AttendanceAudit.js'
import StudentEnrollment from '../models/StudentEnrollment.js'

const validId = mongoose.isValidObjectId
function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value ? date : null
}

function todayLocal() {
  const current = new Date()
  return parseDate(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`)
}

async function validateSection(sectionId, teacherId) {
  if (!validId(sectionId)) return { error: 'Invalid section ID.' }
  const section = await Section.findOne({ _id: sectionId, teacherId }).select('classId name academicYearId')
  if (!section) return { error: 'Section not found.' }
  const classRecord = await Class.findOne({ _id: section.classId, teacherId }).select('name')
  if (!classRecord) return { error: 'Class not found.' }
  return { section, classRecord }
}

async function studentsForSection(sectionId, teacherId) {
  return Student.find({ teacherId, sectionId, status: 'active' }).collation({ locale: 'en', numericOrdering: true }).sort({ rollNumber: 1, _id: 1 }).select('_id studentId rollNumber name').lean()
}

async function checkedRecords(rawRecords, students) {
  if (!Array.isArray(rawRecords)) return { error: 'Attendance records are required.' }
  const activeById = new Map(students.map((student) => [student._id.toString(), student]))
  const seen = new Set()
  const records = []
  for (const row of rawRecords) {
    if (!row || !validId(row.studentId)) return { error: 'Invalid student ID in attendance.' }
    const id = row.studentId.toString()
    if (seen.has(id)) return { error: 'A student appears more than once in attendance.' }
    seen.add(id)
    if (!['present', 'absent'].includes(row.status)) return { error: 'Attendance status must be present or absent.' }
    const student = activeById.get(id)
    if (!student) return { error: 'Each student must be active and belong to the selected section.' }
    records.push({ studentId: student._id, rollNumber: student.rollNumber, studentName: student.name, status: row.status })
  }
  if (seen.size !== activeById.size) return { error: 'Attendance must include every active student in this section.' }
  return { records }
}

export async function getAttendance(req, res) {
  const { sectionId, date } = req.query
  if (!sectionId || !date) return res.status(400).json({ success: false, message: 'Select a section and date.' })
  const day = parseDate(date)
  if (!day) return res.status(400).json({ success: false, message: 'Choose a valid date.' })
  const placement = await validateSection(sectionId, req.user._id)
  if (placement.error) return res.status(placement.error === 'Section not found.' ? 404 : 400).json({ success: false, message: placement.error })
  const [attendance, holiday, students] = await Promise.all([
    Attendance.findOne({ teacherId: req.user._id, sectionId, date: day }).select('-teacherId -__v').lean(),
    Holiday.findOne({ teacherId: req.user._id, date: day }).select('-__v -teacherId').lean(),
    studentsForSection(sectionId, req.user._id),
  ])
  return res.json({ success: true, data: { attendance, holiday, students, classId: placement.section.classId, className: placement.classRecord.name, sectionName: placement.section.name } })
}

export async function attendanceCalendar(req, res) {
  const { sectionId } = req.query
  const month = Number(req.query.month)
  const year = Number(req.query.year)
  if (!sectionId || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1900 || year > 9999) {
    return res.status(400).json({ success: false, message: 'Select a valid section, month, and year.' })
  }
  const placement = await validateSection(sectionId, req.user._id)
  if (placement.error) return res.status(placement.error === 'Section not found.' ? 404 : 400).json({ success: false, message: placement.error })
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))
  const records = await Attendance.find({ teacherId: req.user._id, sectionId, date: { $gte: start, $lt: end } }).select('date').sort({ date: 1 }).lean()
  return res.json({ success: true, data: { markedDates: records.map((record) => record.date.toISOString().slice(0, 10)) } })
}

export async function monthlyAttendance(req, res) {
  const { sectionId } = req.query
  const month = Number(req.query.month)
  const year = Number(req.query.year)
  if (!sectionId || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1900 || year > 9999) {
    return res.status(400).json({ success: false, message: 'Select a valid section, month, and year.' })
  }
  if (!validId(sectionId)) return res.status(400).json({ success: false, message: 'Invalid section ID.' })
  const section = await Section.findById(sectionId).select('teacherId classId name').lean()
  if (!section) return res.status(404).json({ success: false, message: 'Section not found.' })
  if (section.teacherId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'You do not have access to this section.' })
  const classRecord = await Class.findOne({ _id: section.classId, teacherId: req.user._id }).select('name').lean()
  if (!classRecord) return res.status(404).json({ success: false, message: 'Class not found.' })

  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const today = todayLocal()
  const [roster, attendanceRecords, holidays] = await Promise.all([
    Student.find({ teacherId: req.user._id, sectionId, status: 'active' }).select('_id studentId rollNumber name createdAt status updatedAt').lean(),
    Attendance.find({ teacherId: req.user._id, sectionId, date: { $gte: start, $lt: end } }).select('date records').sort({ date: 1 }).lean(),
    Holiday.find({ teacherId: req.user._id, date: { $gte: start, $lt: end } }).select('date name type').sort({ date: 1 }).lean(),
  ])
  const recordedStudentIds = [...new Set(attendanceRecords.flatMap((record) => record.records.map((entry) => entry.studentId.toString())))]
  const historicalStudents = recordedStudentIds.length
    ? await Student.find({ _id: { $in: recordedStudentIds }, teacherId: req.user._id }).select('_id status sectionId updatedAt').lean()
    : []
  const historicalById = new Map(historicalStudents.map((student) => [student._id.toString(), student]))
  const allStudentIds = [...new Set([...roster.map((student) => student._id.toString()), ...recordedStudentIds])]
  const enrollmentRows = allStudentIds.length ? await StudentEnrollment.find({ teacherId: req.user._id, sectionId, studentId: { $in: allStudentIds } }).select('studentId startDate endDate').lean() : []
  const enrollmentsByStudent = new Map()
  for (const enrollment of enrollmentRows) {
    const id = enrollment.studentId.toString()
    if (!enrollmentsByStudent.has(id)) enrollmentsByStudent.set(id, [])
    enrollmentsByStudent.get(id).push(enrollment)
  }
  const holidaysByDate = new Map(holidays.map((holiday) => [holiday.date.toISOString().slice(0, 10), holiday]))
  const attendanceByDate = new Map(attendanceRecords.map((record) => [record.date.toISOString().slice(0, 10), record]))
  const studentsById = new Map()
  for (const student of roster) studentsById.set(student._id.toString(), { studentId: student._id.toString(), studentCode: student.studentId || '', rollNumber: student.rollNumber, name: student.name, active: true, joinedAt: student.createdAt, leftAt: null, enrollments: enrollmentsByStudent.get(student._id.toString()) || [] })
  // Include students with records in this section/month even if they have since moved or become inactive.
  // Attendance snapshots preserve their historical name and roll number.
  for (const record of attendanceRecords) for (const entry of record.records) {
    const id = entry.studentId.toString()
    if (!studentsById.has(id)) {
      const current = historicalById.get(id)
      const leftSection = current && current.sectionId.toString() !== sectionId
      studentsById.set(id, { studentId: id, studentCode: '', rollNumber: entry.rollNumber, name: entry.studentName, active: false, joinedAt: null, leftAt: current && (current.status === 'inactive' || leftSection) ? current.updatedAt : null, enrollments: enrollmentsByStudent.get(id) || [] })
    }
  }

  const students = [...studentsById.values()].map((student) => {
    const attendance = {}
    let present = 0
    let absent = 0
    let holiday = 0
    let notMarked = 0
    let workingDays = 0
    const enrolledOn = (date) => student.enrollments.length
      ? student.enrollments.some((entry) => {
        const startDay = new Date(Date.UTC(entry.startDate.getUTCFullYear(), entry.startDate.getUTCMonth(), entry.startDate.getUTCDate()))
        const endDay = entry.endDate ? new Date(Date.UTC(entry.endDate.getUTCFullYear(), entry.endDate.getUTCMonth(), entry.endDate.getUTCDate())) : null
        return date >= startDay && (!endDay || date <= endDay)
      })
      : (!student.joinedAt || date >= new Date(Date.UTC(student.joinedAt.getUTCFullYear(), student.joinedAt.getUTCMonth(), student.joinedAt.getUTCDate()))) && (!student.leftAt || date <= new Date(Date.UTC(student.leftAt.getUTCFullYear(), student.leftAt.getUTCMonth(), student.leftAt.getUTCDate())))
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(Date.UTC(year, month - 1, day))
      const iso = date.toISOString().slice(0, 10)
      const holidayRecord = holidaysByDate.get(iso)
      const enrolled = enrolledOn(date)
      if (holidayRecord) {
        attendance[iso] = 'holiday'
        if (enrolled) holiday += 1
        continue
      }
      const value = attendanceByDate.get(iso)?.records.find((item) => item.studentId.toString() === student.studentId)?.status
      if (value) attendance[iso] = value
      else attendance[iso] = 'notMarked'
      if (date > today || !enrolled) continue
      workingDays += 1
      if (value === 'present') present += 1
      else if (value === 'absent') absent += 1
      else notMarked += 1
    }
    const recorded = present + absent
    const { enrollments: _enrollments, ...studentData } = student
    return {
      ...studentData,
      attendance,
      summary: { present, absent, holiday, notMarked, workingDays, attendancePercentage: recorded ? Number(((present / recorded) * 100).toFixed(2)) : null },
    }
  }).sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true, sensitivity: 'base' }))

  const workingDays = students.reduce((max, student) => Math.max(max, student.summary.workingDays), 0)
  const present = students.reduce((sum, student) => sum + student.summary.present, 0)
  const absent = students.reduce((sum, student) => sum + student.summary.absent, 0)
  const recordedDates = attendanceRecords.filter((record) => record.records.length > 0).length
  const notMarkedDays = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, index + 1))
    const iso = date.toISOString().slice(0, 10)
    const inSectionPeriod = students.some((student) => {
      const joined = student.joinedAt ? new Date(Date.UTC(student.joinedAt.getUTCFullYear(), student.joinedAt.getUTCMonth(), student.joinedAt.getUTCDate())) : null
      const left = student.leftAt ? new Date(Date.UTC(student.leftAt.getUTCFullYear(), student.leftAt.getUTCMonth(), student.leftAt.getUTCDate())) : null
      const periods = student.enrollments || []
      return periods.length ? periods.some((entry) => date >= new Date(Date.UTC(entry.startDate.getUTCFullYear(), entry.startDate.getUTCMonth(), entry.startDate.getUTCDate())) && (!entry.endDate || date <= new Date(Date.UTC(entry.endDate.getUTCFullYear(), entry.endDate.getUTCMonth(), entry.endDate.getUTCDate())))) : (!joined || date >= joined) && (!left || date <= left)
    })
    return inSectionPeriod && date <= today && !holidaysByDate.has(iso) && !attendanceByDate.has(iso)
  }).filter(Boolean).length
  const recordedTotal = present + absent
  return res.json({ success: true, data: {
    section: { id: section._id, name: section.name, className: classRecord.name },
    period: { month, year, daysInMonth },
    holidays: holidays.map((item) => ({ date: item.date.toISOString().slice(0, 10), name: item.name, type: item.type })),
    students,
    summary: { totalStudents: roster.length, workingDays, holidays: holidays.length, attendanceRecords: recordedDates, averageAttendance: recordedTotal ? Number(((present / recordedTotal) * 100).toFixed(2)) : null, notMarkedDays },
  } })
}

async function saveAttendance(req, res, isUpdate) {
  const day = parseDate(req.body.date)
  if (!day) return res.status(400).json({ success: false, message: 'Choose a valid date.' })
  if (day > todayLocal()) return res.status(400).json({ success: false, message: 'Attendance cannot be marked for a future date.' })
  const sectionId = req.body.sectionId
  const placement = await validateSection(sectionId, req.user._id)
  if (placement.error) return res.status(placement.error === 'Section not found.' ? 404 : 400).json({ success: false, message: placement.error })
  if (await Holiday.exists({ teacherId: req.user._id, date: day })) return res.status(409).json({ success: false, message: 'Attendance is not required for a holiday.' })
  const students = await studentsForSection(sectionId, req.user._id)
  if (!students.length) return res.status(400).json({ success: false, message: 'There are no active students in this section.' })
  const checked = await checkedRecords(req.body.records, students)
  if (checked.error) return res.status(400).json({ success: false, message: checked.error })
  const filter = isUpdate
    ? { _id: req.params.id, teacherId: req.user._id }
    : { teacherId: req.user._id, sectionId, date: day }
  if (isUpdate && !validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid attendance ID.' })
  const current = isUpdate ? await Attendance.findOne(filter) : null
  if (isUpdate && !current) return res.status(404).json({ success: false, message: 'Attendance record not found.' })
  if (current?.lockedAt) return res.status(423).json({ success: false, message: 'Attendance for this date is locked.' })
  if (current && (current.sectionId.toString() !== sectionId || current.date.toISOString().slice(0, 10) !== req.body.date)) {
    return res.status(400).json({ success: false, message: 'Attendance section and date cannot be changed.' })
  }
  const submittedIds = new Set(checked.records.map((record) => record.studentId.toString()))
  const preservedHistoricalRecords = (current?.records || []).filter((record) => !submittedIds.has(record.studentId.toString()))
  const records = [...preservedHistoricalRecords, ...checked.records]
  const previousByStudent = new Map((current?.records || []).map((record) => [record.studentId.toString(), record]))
  const changes = current ? checked.records.flatMap((record) => {
    const old = previousByStudent.get(record.studentId.toString())
    return old && old.status !== record.status ? [{
      teacherId: req.user._id, studentId: record.studentId, studentName: old.studentName || record.studentName,
      rollNumber: old.rollNumber || record.rollNumber, sectionId: current.sectionId,
      sectionName: placement.section.name, date: current.date, oldStatus: old.status,
      newStatus: record.status, changedByName: req.user.name || '', changedAt: new Date(),
    }] : []
  }) : []
  try {
    const attendance = current
      ? await Attendance.findOneAndUpdate(filter, { $set: { records } }, { new: true, runValidators: true })
      : await Attendance.create({ teacherId: req.user._id, sectionId, academicYearId: placement.section.academicYearId || null, date: day, records })
    if (changes.length) await AttendanceAudit.insertMany(changes, { ordered: true })
    await AttendanceDraft.deleteOne({ teacherId: req.user._id, sectionId, date: day })
    const response = attendance.toObject ? attendance.toObject() : { ...attendance }
    delete response.teacherId
    delete response.__v
    return res.status(isUpdate ? 200 : 201).json({ success: true, data: response })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Attendance for this section and date already exists. Reload it to update.' })
    throw error
  }
}

export const createAttendance = (req, res) => saveAttendance(req, res, false)
export const updateAttendance = (req, res) => saveAttendance(req, res, true)

export async function todaySummary(req, res) {
  const day = req.query.date ? parseDate(req.query.date) : todayLocal()
  if (!day) return res.status(400).json({ success: false, message: 'Choose a valid date.' })
  const docs = await Attendance.find({ teacherId: req.user._id, date: day }).select('records.status').lean()
  const totals = docs.flatMap((doc) => doc.records).reduce((result, record) => {
    result[record.status] += 1
    return result
  }, { present: 0, absent: 0 })
  return res.json({ success: true, data: { ...totals, marked: docs.length > 0, sections: docs.length } })
}

