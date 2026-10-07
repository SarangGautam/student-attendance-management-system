import { Router } from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import asyncHandler from '../middleware/asyncHandler.js'
import { discardAttendanceDraft, getAttendanceDraft, listAttendanceHistory, lockAttendance, saveAttendanceDraft } from '../controllers/attendanceWorkflowController.js'

const router = Router()
router.use(authMiddleware)
router.get('/draft', asyncHandler(getAttendanceDraft))
router.put('/draft', asyncHandler(saveAttendanceDraft))
router.delete('/draft', asyncHandler(discardAttendanceDraft))
router.get('/history', asyncHandler(listAttendanceHistory))
router.post('/:id/lock', asyncHandler(lockAttendance))
router.use((error, _req, res, _next) => { console.error('[attendance-workflow]', error); res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' }) })
export default router
