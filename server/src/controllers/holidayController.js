import mongoose from 'mongoose'
import Holiday from '../models/Holiday.js'

function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value ? date : null
}

function payload(body = {}) {
  return {
    date: parseDate(body.date),
    name: typeof body.name === 'string' ? body.name.trim() : '',
    type: typeof body.type === 'string' ? body.type.trim() : '',
    description: typeof body.description === 'string' ? body.description.trim() : '',
  }
}

function validationError(item) {
  if (!item.date) return 'Choose a valid holiday date.'
  if (!item.name) return 'Holiday name is required.'
  if (!item.type) return 'Holiday type is required.'
  if (item.name.length > 120 || item.type.length > 80 || item.description.length > 500) return 'Holiday details are too long.'
  return ''
}

export async function listHolidays(req, res) {
  const filter = { teacherId: req.user._id }
  const month = req.query.month === undefined ? null : Number(req.query.month)
  const year = req.query.year === undefined ? null : Number(req.query.year)
  if ((month !== null && (!Number.isInteger(month) || month < 1 || month > 12)) || (year !== null && (!Number.isInteger(year) || year < 1900 || year > 9999)) || (month !== null && year === null)) {
    return res.status(400).json({ success: false, message: 'Choose a valid month and year.' })
  }
  if (month !== null && year !== null) {
    filter.date = { $gte: new Date(Date.UTC(year, month - 1, 1)), $lt: new Date(Date.UTC(year, month, 1)) }
  } else if (year !== null) {
    filter.date = { $gte: new Date(Date.UTC(year, 0, 1)), $lt: new Date(Date.UTC(year + 1, 0, 1)) }
  }
  if (req.query.date) {
    const date = parseDate(req.query.date)
    if (!date) return res.status(400).json({ success: false, message: 'Choose a valid date.' })
    filter.date = date
  }
  if (req.query.upcoming === 'true' || req.query.upcoming === '1') {
    const current = new Date()
    const today = parseDate(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`)
    filter.date = { $gte: today }
  }
  const parsedLimit = Number.parseInt(req.query.limit, 10)
  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : null
  let query = Holiday.find(filter).sort({ date: 1 }).select('-__v -teacherId')
  if (limit) query = query.limit(limit)
  const holidays = await query.lean()
  return res.json({ success: true, data: holidays })
}

export async function createHoliday(req, res) {
  const item = payload(req.body)
  const error = validationError(item)
  if (error) return res.status(400).json({ success: false, message: error })
  try {
    const holiday = await Holiday.create({ ...item, teacherId: req.user._id })
    const data = holiday.toObject()
    delete data.teacherId
    delete data.__v
    return res.status(201).json({ success: true, data })
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'A holiday already exists on this date.' })
    throw err
  }
}

export async function updateHoliday(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid holiday ID.' })
  const item = payload(req.body)
  const error = validationError(item)
  if (error) return res.status(400).json({ success: false, message: error })
  try {
    const holiday = await Holiday.findOneAndUpdate({ _id: req.params.id, teacherId: req.user._id }, item, { new: true, runValidators: true }).select('-__v -teacherId')
    if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found.' })
    return res.json({ success: true, data: holiday })
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'A holiday already exists on this date.' })
    throw err
  }
}

export async function deleteHoliday(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid holiday ID.' })
  const holiday = await Holiday.findOneAndDelete({ _id: req.params.id, teacherId: req.user._id })
  if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found.' })
  return res.json({ success: true, message: 'Holiday removed.' })
}
