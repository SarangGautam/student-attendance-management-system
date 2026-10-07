import mongoose from 'mongoose'

const enrollmentSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null },
  startDate: { type: Date, required: true },
  endDate: { type: Date, default: null },
  studentName: { type: String, required: true, trim: true },
  rollNumber: { type: String, required: true, trim: true },
}, { timestamps: true })

enrollmentSchema.index({ teacherId: 1, studentId: 1, startDate: 1 })
enrollmentSchema.index({ teacherId: 1, studentId: 1 }, { unique: true, partialFilterExpression: { endDate: null } })
enrollmentSchema.index({ teacherId: 1, sectionId: 1, startDate: 1, endDate: 1 })
export default mongoose.model('StudentEnrollment', enrollmentSchema)
