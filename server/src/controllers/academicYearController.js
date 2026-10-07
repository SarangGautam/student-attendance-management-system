import mongoose from 'mongoose'
import AcademicYear from '../models/AcademicYear.js'

function isoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value ? date : null
}
function payload(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const startDate = isoDate(body.startDate)
  const endDate = isoDate(body.endDate)
  if (!name || name.length > 30 || !startDate || !endDate || endDate <= startDate) return { error: 'Enter a name and a valid date range for the academic year.' }
  return { value: { name, startDate, endDate, isActive: Boolean(body.isActive) } }
}
export async function listAcademicYears(req, res) {
  const data = await AcademicYear.find({ teacherId: req.user._id }).select('-teacherId -__v').sort({ startDate: -1 }).lean()
  return res.json({ success: true, data })
}
export async function createAcademicYear(req, res) {
  const checked = payload(req.body || {})
  if (checked.error) return res.status(400).json({ success: false, message: checked.error })
  try {
    if (checked.value.isActive) await AcademicYear.updateMany({ teacherId: req.user._id, isActive: true }, { $set: { isActive: false } })
    const data = await AcademicYear.create({ ...checked.value, teacherId: req.user._id })
    return res.status(201).json({ success: true, data })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'An academic year with this name already exists.' })
    throw error
  }
}
export async function updateAcademicYear(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid academic year ID.' })
  const checked = payload(req.body || {})
  if (checked.error) return res.status(400).json({ success: false, message: checked.error })
  const current = await AcademicYear.findOne({ _id: req.params.id, teacherId: req.user._id })
  if (!current) return res.status(404).json({ success: false, message: 'Academic year not found.' })
  try {
    if (checked.value.isActive) await AcademicYear.updateMany({ teacherId: req.user._id, _id: { $ne: current._id }, isActive: true }, { $set: { isActive: false } })
    Object.assign(current, checked.value)
    await current.save()
    return res.json({ success: true, data: current })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'An academic year with this name already exists.' })
    throw error
  }
}
export async function activateAcademicYear(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid academic year ID.' })
  const year = await AcademicYear.findOne({ _id: req.params.id, teacherId: req.user._id })
  if (!year) return res.status(404).json({ success: false, message: 'Academic year not found.' })
  try {
    await AcademicYear.updateMany({ teacherId: req.user._id, isActive: true }, { $set: { isActive: false } })
    year.isActive = true
    await year.save()
    return res.json({ success: true, data: year })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Another academic year was activated at the same time. Refresh and try again.' })
    throw error
  }
}
