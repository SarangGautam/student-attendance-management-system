import { Router } from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import asyncHandler from '../middleware/asyncHandler.js'
import { bulkImportStudents, createStudent, deactivateStudent, getStudent, listStudents, previewStudentImport, updateStudent } from '../controllers/studentController.js'
import { enrollmentHistory, transferStudent } from '../controllers/enrollmentController.js'

const router = Router()
router.use(authMiddleware)
router.get('/', asyncHandler(listStudents))
router.post('/bulk-import/preview', asyncHandler(previewStudentImport))
router.post('/bulk-import', asyncHandler(bulkImportStudents))
router.get('/:studentId/enrollments', asyncHandler(enrollmentHistory))
router.post('/:studentId/transfer', asyncHandler(transferStudent))
router.post('/', asyncHandler(createStudent))
router.get('/:id', asyncHandler(getStudent))
router.put('/:id', asyncHandler(updateStudent))
router.delete('/:id', asyncHandler(deactivateStudent))
router.use((error, _req, res, _next) => {
  console.error('[students]', error)
  if (error.code === 11000) return res.status(409).json({ success: false, message: 'This student ID or roll number already exists.' })
  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' })
})
export default router
