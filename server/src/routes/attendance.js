import { Router } from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import asyncHandler from '../middleware/asyncHandler.js'
import { attendanceCalendar, createAttendance, getAttendance, monthlyAttendance, todaySummary, updateAttendance } from '../controllers/attendanceController.js'

const router = Router()
router.use(authMiddleware)
router.get('/today-summary', asyncHandler(todaySummary))
router.get('/calendar', asyncHandler(attendanceCalendar))
router.get('/monthly', asyncHandler(monthlyAttendance))
router.get('/', asyncHandler(getAttendance))
router.post('/', asyncHandler(createAttendance))
router.put('/:id', asyncHandler(updateAttendance))
router.use((error, _req, res, _next) => {
  console.error('[attendance]', error)
  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' })
})
export default router
