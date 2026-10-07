import { Router } from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import asyncHandler from '../middleware/asyncHandler.js'
import { createSection, deleteSection, listSections, updateSection } from '../controllers/sectionController.js'

const router = Router()
router.use(authMiddleware)
router.get('/', asyncHandler(listSections))
router.post('/', asyncHandler(createSection))
router.put('/:id', asyncHandler(updateSection))
router.delete('/:id', asyncHandler(deleteSection))
router.use((error, _req, res, _next) => {
  console.error('[sections]', error)
  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' })
})
export default router
