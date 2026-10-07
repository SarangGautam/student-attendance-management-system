import { Router } from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import asyncHandler from '../middleware/asyncHandler.js'
import { createHoliday, deleteHoliday, listHolidays, updateHoliday } from '../controllers/holidayController.js'

const router = Router()
router.use(authMiddleware)
router.get('/', asyncHandler(listHolidays))
router.post('/', asyncHandler(createHoliday))
router.put('/:id', asyncHandler(updateHoliday))
router.delete('/:id', asyncHandler(deleteHoliday))
router.use((error, _req, res, _next) => {
  console.error('[holidays]', error)
  if (error.code === 11000) return res.status(409).json({ success: false, message: 'A holiday already exists on this date.' })
  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' })
})
export default router
