import mongoose from 'mongoose'
import Class from '../models/Class.js'
import Section from '../models/Section.js'
import Student from '../models/Student.js'
import AcademicYear from '../models/AcademicYear.js'
import StudentEnrollment from '../models/StudentEnrollment.js'

const validId = mongoose.isValidObjectId
const normalizeText = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function todayAsUtcDate() { const now = new Date(); return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) }

function studentPayload(body = {}) {
  return {
    studentId: normalizeText(body.studentId) || undefined,
    rollNumber: normalizeText(body.rollNumber),
    name: normalizeText(body.name),
    classId: body.classId,
    sectionId: body.sectionId,
    parentName: normalizeText(body.parentName),
    parentContact: normalizeText(body.parentContact),
    status: body.status || 'active',
  }
}

function validateStudentFields(student) {
  if (!student.name) return 'Student name is required.'
  if (!student.rollNumber) return 'Roll number is required.'
  if (!student.classId) return 'Please select a class.'
  if (!student.sectionId) return 'Please select a section.'
  if (student.parentContact && !/^[+()\-\s\d.]{5,40}$/.test(student.parentContact)) return 'Enter a valid parent contact number.'
  if (!['active', 'inactive'].includes(student.status)) return 'Choose a valid student status.'
  if (student.studentId && student.studentId.length > 80) return 'Student ID must be 80 characters or fewer.'
  return ''
}

async function validatePlacement({ classId, sectionId }, teacherId) {
  if (!validId(classId)) return { error: 'Invalid class ID.' }
  if (!validId(sectionId)) return { error: 'Invalid section ID.' }
  const [classRecord, sectionRecord] = await Promise.all([
    Class.findOne({ _id: classId, teacherId }).select('name academicYearId'),
    Section.findOne({ _id: sectionId, teacherId }).select('name classId'),
  ])
  if (!classRecord) return { error: 'Class not found.' }
  if (!sectionRecord) return { error: 'Section not found.' }
  if (sectionRecord.classId.toString() !== classId.toString()) return { error: 'The selected section does not belong to the selected class.' }
  return { classRecord, sectionRecord }
}

function pageLimit(value) {
  const parsed = Number.parseInt(value, 10)
  return [25, 50, 100].includes(parsed) ? parsed : 50
}

export async function listStudents(req, res) {
  const { classId, sectionId, status, search } = req.query
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
  const limit = pageLimit(req.query.limit)
  const filter = { teacherId: req.user._id }
  if (classId) {
    if (!validId(classId)) return res.status(400).json({ success: false, message: 'Invalid class ID.' })
    if (!await Class.exists({ _id: classId, teacherId: req.user._id })) return res.status(404).json({ success: false, message: 'Class not found.' })
    filter.classId = classId
  }
  if (sectionId) {
    if (!validId(sectionId)) return res.status(400).json({ success: false, message: 'Invalid section ID.' })
    const section = await Section.findOne({ _id: sectionId, teacherId: req.user._id }).select('classId')
    if (!section) return res.status(404).json({ success: false, message: 'Section not found.' })
    if (classId && section.classId.toString() !== classId) return res.status(400).json({ success: false, message: 'The selected section does not belong to the selected class.' })
    filter.sectionId = section._id
  }
  if (status && status !== 'all') {
    if (!['active', 'inactive'].includes(status)) return res.status(400).json({ success: false, message: 'Choose a valid student status.' })
    filter.status = status
  }
  if (typeof search === 'string' && search.trim()) {
    const term = new RegExp(escapeRegex(search.trim()), 'i')
    filter.$or = [{ name: term }, { rollNumber: term }, { studentId: term }]
  }

  const [students, total] = await Promise.all([
    Student.find(filter).sort({ createdAt: -1, _id: 1 }).skip((page - 1) * limit).limit(limit)
      .populate('classId', 'name').populate('sectionId', 'name').select('-teacherId -__v').lean(),
    Student.countDocuments(filter),
  ])
  return res.json({ success: true, data: { students, total, page, limit, totalPages: Math.ceil(total / limit) } })
}

export async function getStudent(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid student ID.' })
  const student = await Student.findOne({ _id: req.params.id, teacherId: req.user._id })
    .populate('classId', 'name').populate('sectionId', 'name').select('-teacherId -__v')
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' })
  return res.json({ success: true, data: student })
}

export async function createStudent(req, res) {
  const student = studentPayload(req.body)
  const fieldError = validateStudentFields(student)
  if (fieldError) return res.status(400).json({ success: false, message: fieldError })
  const placement = await validatePlacement(student, req.user._id)
  if (placement.error) return res.status(400).json({ success: false, message: placement.error })
  try {
    const activeYear = await AcademicYear.findOne({ teacherId: req.user._id, isActive: true }).select('_id')
    const created = await Student.create({ ...student, teacherId: req.user._id, academicYearId: placement.classRecord.academicYearId || activeYear?._id || null })
    await StudentEnrollment.create({ teacherId: req.user._id, studentId: created._id, classId: created.classId, sectionId: created.sectionId, academicYearId: created.academicYearId || null, startDate: todayAsUtcDate(), endDate: null, studentName: created.name, rollNumber: created.rollNumber })
    return res.status(201).json({ success: true, message: 'Student created successfully.', data: created })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: duplicateMessage(error, student, placement.sectionRecord.name) })
    if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: 'Please check the student details and try again.' })
    throw error
  }
}

function duplicateMessage(error, student, sectionName = '') {
  if (error.keyPattern?.studentId) return `Student ID ${student.studentId} already exists.`
  return `Roll number ${student.rollNumber} already exists in Section ${sectionName}.`
}

export async function updateStudent(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid student ID.' })
  const current = await Student.findOne({ _id: req.params.id, teacherId: req.user._id })
  if (!current) return res.status(404).json({ success: false, message: 'Student not found.' })
  const student = studentPayload({ ...current.toObject(), ...req.body })
  if (student.classId?.toString() !== current.classId.toString() || student.sectionId?.toString() !== current.sectionId.toString()) return res.status(409).json({ success: false, message: 'Use Transfer Student to change a student’s class or section so enrollment history is preserved.' })
  const fieldError = validateStudentFields(student)
  if (fieldError) return res.status(400).json({ success: false, message: fieldError })
  const placement = await validatePlacement(student, req.user._id)
  if (placement.error) return res.status(400).json({ success: false, message: placement.error })
  const reactivating = current.status === 'inactive' && student.status === 'active'
  try {
    Object.assign(current, student)
    await current.save()
    if (reactivating) {
      const activeYear = await AcademicYear.findOne({ teacherId: req.user._id, isActive: true }).select('_id')
      await StudentEnrollment.create({ teacherId: req.user._id, studentId: current._id, classId: current.classId, sectionId: current.sectionId, academicYearId: current.academicYearId || placement.classRecord.academicYearId || activeYear?._id || null, startDate: todayAsUtcDate(), endDate: null, studentName: current.name, rollNumber: current.rollNumber })
    }
    return res.json({ success: true, message: 'Student updated successfully.', data: current })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: duplicateMessage(error, student, placement.sectionRecord.name) })
    if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: 'Please check the student details and try again.' })
    throw error
  }
}

export async function deactivateStudent(req, res) {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid student ID.' })
  const student = await Student.findOne({ _id: req.params.id, teacherId: req.user._id })
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' })
  student.status = 'inactive'
  await student.save()
  const activeEnrollment = await StudentEnrollment.findOne({ teacherId: req.user._id, studentId: student._id, endDate: null }).sort({ startDate: -1 })
  if (activeEnrollment) { activeEnrollment.endDate = todayAsUtcDate(); await activeEnrollment.save() }
  else {
    const startDate = new Date(student.createdAt)
    startDate.setUTCHours(0, 0, 0, 0)
    await StudentEnrollment.create({ teacherId: req.user._id, studentId: student._id, classId: student.classId, sectionId: student.sectionId, academicYearId: student.academicYearId || null, startDate, endDate: todayAsUtcDate(), studentName: student.name, rollNumber: student.rollNumber })
  }
  return res.json({ success: true, message: 'Student deactivated successfully.', data: student })
}

async function inspectImportRows(rows, classId, sectionId, teacherId) {
  if (!Array.isArray(rows) || rows.length === 0) return { error: 'The import file contains no student rows.' }
  if (rows.length > 2000) return { error: 'Import up to 2,000 students at a time.' }
  const placement = await validatePlacement({ classId, sectionId }, teacherId)
  if (placement.error) return { error: placement.error }
  const candidates = rows.map((raw, index) => ({ row: index + 2, ...studentPayload({ ...raw, classId, sectionId }) }))
  const rolls = candidates.filter((row) => row.rollNumber).map((row) => row.rollNumber)
  const studentIds = candidates.filter((row) => row.studentId).map((row) => row.studentId)
  const [existingRollsDocs, existingIdDocs] = await Promise.all([
    rolls.length ? Student.find({ teacherId, sectionId, rollNumber: { $in: rolls } }).collation({ locale: 'en', strength: 2 }).select('rollNumber').lean() : [],
    studentIds.length ? Student.find({ teacherId, studentId: { $in: studentIds } }).collation({ locale: 'en', strength: 2 }).select('studentId').lean() : [],
  ])
  const existingRolls = new Set(existingRollsDocs.map((item) => item.rollNumber.toLocaleLowerCase()))
  const existingIds = new Set(existingIdDocs.map((item) => item.studentId?.toLocaleLowerCase()).filter(Boolean))
  const seenRolls = new Set()
  const seenIds = new Set()
  const validated = candidates.map((row) => {
    const issues = []
    const fieldError = validateStudentFields(row)
    if (fieldError) issues.push(fieldError)
    const rollKey = row.rollNumber.toLocaleLowerCase()
    const studentKey = row.studentId?.toLocaleLowerCase()
    if (row.rollNumber && (seenRolls.has(rollKey) || existingRolls.has(rollKey))) issues.push(`Roll number ${row.rollNumber} already exists in Section ${placement.sectionRecord.name}.`)
    if (studentKey && (seenIds.has(studentKey) || existingIds.has(studentKey))) issues.push(`Student ID ${row.studentId} already exists.`)
    if (row.rollNumber) seenRolls.add(rollKey)
    if (studentKey) seenIds.add(studentKey)
    return { ...row, status: issues.length ? 'invalid' : 'valid', errors: [...new Set(issues)] }
  })
  return { rows: validated, valid: validated.filter((row) => row.status === 'valid'), invalid: validated.filter((row) => row.status === 'invalid'), sectionName: placement.sectionRecord.name }
}

export async function previewStudentImport(req, res) {
  const result = await inspectImportRows(req.body.students, req.body.classId, req.body.sectionId, req.user._id)
  if (result.error) return res.status(400).json({ success: false, message: result.error })
  return res.json({ success: true, data: { rows: result.rows, validCount: result.valid.length, invalidCount: result.invalid.length, total: result.rows.length } })
}

export async function bulkImportStudents(req, res) {
  const result = await inspectImportRows(req.body.students, req.body.classId, req.body.sectionId, req.user._id)
  if (result.error) return res.status(400).json({ success: false, message: result.error })
  if (!result.valid.length) return res.status(400).json({ success: false, message: 'There are no valid records to import.', data: { imported: 0, validCount: 0, invalidCount: result.invalid.length, errors: result.invalid } })
  const [activeYear, classRecord] = await Promise.all([
    AcademicYear.findOne({ teacherId: req.user._id, isActive: true }).select('_id'),
    Class.findOne({ _id: req.body.classId, teacherId: req.user._id }).select('academicYearId'),
  ])
  const academicYearId = classRecord?.academicYearId || activeYear?._id || null
  const startDate = todayAsUtcDate()
  const documents = result.valid.map((row) => ({
    teacherId: req.user._id, studentId: row.studentId, rollNumber: row.rollNumber, name: row.name,
    classId: req.body.classId, sectionId: req.body.sectionId, parentName: row.parentName,
    parentContact: row.parentContact, status: 'active', academicYearId,
  }))
  try {
    const inserted = await Student.insertMany(documents, { ordered: false })
    await StudentEnrollment.insertMany(inserted.map((student) => ({ teacherId: req.user._id, studentId: student._id, classId: student.classId, sectionId: student.sectionId, academicYearId, startDate, endDate: null, studentName: student.name, rollNumber: student.rollNumber })), { ordered: false })
    return res.status(201).json({ success: true, message: `${inserted.length} students imported successfully.`, data: { imported: inserted.length, validCount: result.valid.length, invalidCount: result.invalid.length, errors: result.invalid } })
  } catch (error) {
    if (error.name === 'BulkWriteError' || error.code === 11000) {
      const inserted = error.insertedDocs?.length || 0
      return res.status(207).json({ success: true, message: `${inserted} students imported. Some rows conflicted with existing records.`, data: { imported: inserted, validCount: result.valid.length, invalidCount: result.invalid.length + (result.valid.length - inserted), errors: result.invalid } })
    }
    throw error
  }
}
