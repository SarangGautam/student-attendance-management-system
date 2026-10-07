import mongoose from 'mongoose'

const attendanceEntrySchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  rollNumber: { type: String, required: true, trim: true },
  studentName: { type: String, required: true, trim: true },
  status: { type: String, enum: ['present', 'absent'], required: true },
}, { _id: false })

const attendanceSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null, index: true },
  lockedAt: { type: Date, default: null },
  lockedByName: { type: String, default: '' },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  date: { type: Date, required: true },
  records: { type: [attendanceEntrySchema], default: [] },
}, { timestamps: true })

attendanceSchema.index({ teacherId: 1, sectionId: 1, date: 1 }, { unique: true })
attendanceSchema.index({ teacherId: 1, date: 1 })

export default mongoose.model('Attendance', attendanceSchema)
