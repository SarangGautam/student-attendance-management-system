import { Router } from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import asyncHandler from '../middleware/asyncHandler.js'
import { createClass, deleteClass, listClasses, updateClass } from '../controllers/classController.js'

const router = Router()
router.use(authMiddleware)
router.get('/', asyncHandler(listClasses))
router.post('/', asyncHandler(createClass))
router.put('/:id', asyncHandler(updateClass))
router.delete('/:id', asyncHandler(deleteClass))
router.use((error, _req, res, _next) => {
  console.error('[classes]', error)
  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' })
})
export default router
