import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { connectDatabase } from './config/database.js'
import healthRouter from './routes/health.js'
import authRouter from './routes/auth.js'
import classesRouter from './routes/classes.js'
import sectionsRouter from './routes/sections.js'
import studentsRouter from './routes/students.js'
import attendanceRouter from './routes/attendance.js'
import holidaysRouter from './routes/holidays.js'
import settingsRouter from './routes/settings.js'
import academicYearsRouter from './routes/academicYears.js'
import attendanceWorkflowRouter from './routes/attendanceWorkflow.js'

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json({ limit: '5mb' }))
app.use(cookieParser())
app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/classes', classesRouter)
app.use('/api/sections', sectionsRouter)
app.use('/api/students', studentsRouter)
app.use('/api/academic-years', academicYearsRouter)
app.use('/api/attendance', attendanceWorkflowRouter)
app.use('/api/attendance', attendanceRouter)
app.use('/api/holidays', holidaysRouter)
app.use('/api/settings', settingsRouter)

app.listen(PORT, async () => {
  console.log(`Student Attendance API running at http://localhost:${PORT}`)
  try {
    await connectDatabase()
  } catch (error) {
    console.error('[database] MongoDB connection failed:', error.message)
  }
})
