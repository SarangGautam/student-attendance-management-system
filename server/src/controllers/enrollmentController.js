import mongoose from 'mongoose'
import AcademicYear from '../models/AcademicYear.js'
import Class from '../models/Class.js'
import Section from '../models/Section.js'
import Student from '../models/Student.js'
import StudentEnrollment from '../models/StudentEnrollment.js'

const validId = mongoose.isValidObjectId
function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value ? date : null
}
function priorDate(date) { return new Date(date.valueOf() - 86400000) }
function todayDate() { const now = new Date(); return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) }

export async function enrollmentHistory(req, res) {
  if (!validId(req.params.studentId)) return res.status(400).json({ success: false, message: 'Invalid student ID.' })
  const student = await Student.findOne({ _id: req.params.studentId, teacherId: req.user._id }).select('_id createdAt classId sectionId name rollNumber academicYearId')
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' })
  let history = await StudentEnrollment.find({ teacherId: req.user._id, studentId: student._id }).populate('classId', 'name').populate('sectionId', 'name').populate('academicYearId', 'name').sort({ startDate: 1 }).lean()
  if (!history.length) history = [{ studentName: student.name, rollNumber: student.rollNumber, classId: await Class.findOne({ _id: student.classId, teacherId: req.user._id }).select('name').lean(), sectionId: await Section.findOne({ _id: student.sectionId, teacherId: req.user._id }).select('name').lean(), startDate: student.createdAt, endDate: null, legacy: true }]
  return res.json({ success: true, data: history })
}

export async function transferStudent(req, res) {
  const { studentId } = req.params
  if (!validId(studentId)) return res.status(400).json({ success: false, message: 'Invalid student ID.' })
  const effectiveDate = parseDate(req.body?.effectiveDate)
  if (!effectiveDate) return res.status(400).json({ success: false, message: 'Choose a valid effective date.' })
  if (effectiveDate > todayDate()) return res.status(400).json({ success: false, message: 'Transfer effective date cannot be in the future.' })
  if (!validId(req.body?.classId) || !validId(req.body?.sectionId)) return res.status(400).json({ success: false, message: 'Choose a valid destination class and section.' })
  const student = await Student.findOne({ _id: studentId, teacherId: req.user._id })
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' })
  if (student.status !== 'active') return res.status(409).json({ success: false, message: 'Only active students can be transferred.' })
  const [classRecord, section] = await Promise.all([
    Class.findOne({ _id: req.body.classId, teacherId: req.user._id }).select('name academicYearId'),
    Section.findOne({ _id: req.body.sectionId, teacherId: req.user._id }).select('name classId academicYearId'),
  ])
  if (!classRecord || !section) return res.status(404).json({ success: false, message: 'Destination class or section not found.' })
  if (section.classId.toString() !== classRecord._id.toString()) return res.status(400).json({ success: false, message: 'The selected section does not belong to the selected class.' })
  if (student.classId.toString() === classRecord._id.toString() && student.sectionId.toString() === section._id.toString()) return res.status(400).json({ success: false, message: 'Choose a different destination section.' })
  if (await Student.exists({ teacherId: req.user._id, sectionId: section._id, rollNumber: student.rollNumber, _id: { $ne: student._id } })) return res.status(409).json({ success: false, message: `Roll number ${student.rollNumber} already exists in Section ${section.name}.` })
  const dateKey = effectiveDate.toISOString().slice(0, 10)
  const [oldClass, oldSection, activeYear] = await Promise.all([
    Class.findOne({ _id: student.classId, teacherId: req.user._id }).select('name'),
    Section.findOne({ _id: student.sectionId, teacherId: req.user._id }).select('name'),
    AcademicYear.findOne({ teacherId: req.user._id, isActive: true }).select('_id'),
  ])
  let history = await StudentEnrollment.find({ teacherId: req.user._id, studentId: student._id }).sort({ startDate: 1 })
  if (!history.length) {
    const oldStart = new Date(student.createdAt)
    oldStart.setUTCHours(0, 0, 0, 0)
    history = [await StudentEnrollment.create({ teacherId: req.user._id, studentId: student._id, classId: student.classId, sectionId: student.sectionId, academicYearId: student.academicYearId || null, startDate: oldStart, endDate: null, studentName: student.name, rollNumber: student.rollNumber })]
  }
  const currentEnrollment = [...history].reverse().find((item) => !item.endDate)
  const currentStart = currentEnrollment?.startDate
  if (currentStart && effectiveDate <= currentStart) return res.status(400).json({ success: false, message: 'Transfer date must be after the current enrollment start date.' })
  const lastDay = priorDate(effectiveDate)
  try {
    if (currentEnrollment) { currentEnrollment.endDate = lastDay; await currentEnrollment.save() }
    const newEnrollment = await StudentEnrollment.create({ teacherId: req.user._id, studentId: student._id, classId: classRecord._id, sectionId: section._id, academicYearId: section.academicYearId || classRecord.academicYearId || activeYear?._id || null, startDate: effectiveDate, endDate: null, studentName: student.name, rollNumber: student.rollNumber })
    student.classId = classRecord._id
    student.sectionId = section._id
    student.academicYearId = newEnrollment.academicYearId || undefined
    await student.save()
    return res.json({ success: true, message: `Student transferred from ${oldClass?.name || 'previous class'}-${oldSection?.name || ''} to ${classRecord.name}-${section.name} effective ${dateKey}.`, data: newEnrollment })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'This roll number already exists in the destination section.' })
    throw error
  }
}
