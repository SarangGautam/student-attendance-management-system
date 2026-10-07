import { Router } from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import asyncHandler from '../middleware/asyncHandler.js'
import { changePassword, getSettings, updateSettings } from '../controllers/settingsController.js'

const router = Router()
router.use(authMiddleware)
router.get('/', asyncHandler(getSettings))
router.put('/', asyncHandler(updateSettings))
router.post('/change-password', asyncHandler(changePassword))
router.use((error, _req, res, _next) => {
  console.error('[settings]', error)
  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' })
})
export default router
