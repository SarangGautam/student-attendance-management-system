import mongoose from 'mongoose'
import Class from '../models/Class.js'
import Section from '../models/Section.js'
import AcademicYear from '../models/AcademicYear.js'

const className = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
const invalidId = (id) => !mongoose.isValidObjectId(id)

export async function listClasses(req, res) {
  const classes = await Class.aggregate([
    { $match: { teacherId: req.user._id } },
    { $lookup: { from: 'sections', let: { currentClass: '$_id' }, pipeline: [{ $match: { $expr: { $eq: ['$classId', '$$currentClass'] } } }, { $count: 'count' }], as: 'sectionStats' } },
    { $addFields: { sectionCount: { $ifNull: [{ $arrayElemAt: ['$sectionStats.count', 0] }, 0] } } },
    { $project: { sectionStats: 0, teacherId: 0, __v: 0 } },
    { $sort: { createdAt: 1 } },
  ])
  return res.json({ success: true, data: classes })
}

export async function createClass(req, res) {
  const name = className(req.body.name)
  if (!name) return res.status(400).json({ success: false, message: 'Please enter a class name.' })
  try {
    const activeYear = await AcademicYear.findOne({ teacherId: req.user._id, isActive: true }).select('_id')
    const created = await Class.create({ name, teacherId: req.user._id, academicYearId: activeYear?._id || null })
    return res.status(201).json({ success: true, message: 'Class created successfully.', data: created })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: `${name} already exists.` })
    throw error
  }
}

export async function updateClass(req, res) {
  if (invalidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid class ID.' })
  const name = className(req.body.name)
  if (!name) return res.status(400).json({ success: false, message: 'Please enter a class name.' })
  const current = await Class.findOne({ _id: req.params.id, teacherId: req.user._id })
  if (!current) return res.status(404).json({ success: false, message: 'Class not found.' })
  try {
    current.name = name
    await current.save()
    return res.json({ success: true, message: 'Class updated successfully.', data: current })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: `${name} already exists.` })
    throw error
  }
}

export async function deleteClass(req, res) {
  if (invalidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid class ID.' })
  const current = await Class.findOne({ _id: req.params.id, teacherId: req.user._id })
  if (!current) return res.status(404).json({ success: false, message: 'Class not found.' })
  // Keep this relationship guard as the place to add future student and attendance checks.
  if (await Section.exists({ classId: current._id, teacherId: req.user._id })) {
    return res.status(409).json({ success: false, message: 'Delete this class’s sections before deleting the class.' })
  }
  await current.deleteOne()
  return res.json({ success: true, message: 'Class deleted successfully.' })
}
