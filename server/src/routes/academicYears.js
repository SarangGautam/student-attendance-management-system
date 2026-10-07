import { Router } from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import asyncHandler from '../middleware/asyncHandler.js'
import { activateAcademicYear, createAcademicYear, listAcademicYears, updateAcademicYear } from '../controllers/academicYearController.js'

const router = Router()
router.use(authMiddleware)
router.get('/', asyncHandler(listAcademicYears))
router.post('/', asyncHandler(createAcademicYear))
router.put('/:id', asyncHandler(updateAcademicYear))
router.post('/:id/activate', asyncHandler(activateAcademicYear))
router.use((error, _req, res, _next) => { console.error('[academic-years]', error); res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' }) })
export default router
