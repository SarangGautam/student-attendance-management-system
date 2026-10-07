import mongoose from 'mongoose'
import Class from '../models/Class.js'
import Section from '../models/Section.js'
import Student from '../models/Student.js'

const sectionName = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
const invalidId = (id) => !mongoose.isValidObjectId(id)
const duplicateMessage = async (name, classId) => {
  const parent = await Class.findById(classId).select('name')
  return `${name} already exists in ${parent?.name || 'this class'}.`
}

export async function listSections(req, res) {
  const filter = { teacherId: req.user._id }
  if (req.query.classId) {
    if (invalidId(req.query.classId)) return res.status(400).json({ success: false, message: 'Invalid class ID.' })
    const parent = await Class.findOne({ _id: req.query.classId, teacherId: req.user._id })
    if (!parent) return res.status(404).json({ success: false, message: 'Class not found.' })
    filter.classId = parent._id
  }
  const data = await Section.aggregate([
    { $match: filter },
    { $lookup: { from: 'students', let: { currentSection: '$_id' }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$sectionId', '$$currentSection'] }, { $eq: ['$teacherId', req.user._id] }, { $eq: ['$status', 'active'] }] } } }, { $count: 'count' }], as: 'studentStats' } },
    { $addFields: { studentCount: { $ifNull: [{ $arrayElemAt: ['$studentStats.count', 0] }, 0] } } },
    { $project: { studentStats: 0, teacherId: 0, __v: 0 } },
    { $sort: { createdAt: 1 } },
  ])
  return res.json({ success: true, data })
}

export async function createSection(req, res) {
  const name = sectionName(req.body.name)
  const { classId } = req.body
  if (!name) return res.status(400).json({ success: false, message: 'Please enter a section name.' })
  if (!classId) return res.status(400).json({ success: false, message: 'Please select a class.' })
  if (invalidId(classId)) return res.status(400).json({ success: false, message: 'Invalid class ID.' })
  const parent = await Class.findOne({ _id: classId, teacherId: req.user._id }).select('name academicYearId')
  if (!parent) return res.status(404).json({ success: false, message: 'Class not found.' })
  try {
    const data = await Section.create({ name, classId: parent._id, teacherId: req.user._id, academicYearId: parent.academicYearId || null })
    return res.status(201).json({ success: true, message: 'Section created successfully.', data })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: await duplicateMessage(name, parent._id) })
    throw error
  }
}

export async function updateSection(req, res) {
  if (invalidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid section ID.' })
  const name = sectionName(req.body.name)
  if (!name) return res.status(400).json({ success: false, message: 'Please enter a section name.' })
  const current = await Section.findOne({ _id: req.params.id, teacherId: req.user._id })
  if (!current) return res.status(404).json({ success: false, message: 'Section not found.' })
  try {
    current.name = name
    await current.save()
    return res.json({ success: true, message: 'Section updated successfully.', data: current })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: await duplicateMessage(name, current.classId) })
    throw error
  }
}

export async function deleteSection(req, res) {
  if (invalidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid section ID.' })
  const current = await Section.findOne({ _id: req.params.id, teacherId: req.user._id })
  if (!current) return res.status(404).json({ success: false, message: 'Section not found.' })
  if (await Student.exists({ sectionId: current._id, teacherId: req.user._id })) {
    return res.status(409).json({ success: false, message: 'This section contains student records. Move or deactivate those students before deleting the section.' })
  }
  await current.deleteOne()
  return res.json({ success: true, message: 'Section deleted successfully.' })
}
