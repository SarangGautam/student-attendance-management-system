import mongoose from 'mongoose'

const attendanceAuditSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  studentName: { type: String, required: true },
  rollNumber: { type: String, required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  sectionName: { type: String, required: true },
  date: { type: Date, required: true },
  oldStatus: { type: String, enum: ['present', 'absent'], required: true },
  newStatus: { type: String, enum: ['present', 'absent'], required: true },
  changedByName: { type: String, default: '' },
  changedAt: { type: Date, default: Date.now },
}, { timestamps: false })

attendanceAuditSchema.index({ teacherId:  1, date: -1, sectionId: 1 })
attendanceAuditSchema.index({ teacherId: 1, studentId: 1, date: -1 })
export default mongoose.model('AttendanceAudit', attendanceAuditSchema)
