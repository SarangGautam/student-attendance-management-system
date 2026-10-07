import mongoose from 'mongoose'

const academicYearSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  name: { type: String, required: true, trim: true, maxlength: 30 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: false },
}, { timestamps: true })

academicYearSchema.index({ teacherId: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } })
academicYearSchema.index({ teacherId: 1, isActive: 1 })
academicYearSchema.index({ teacherId: 1 }, { unique: true, partialFilterExpression: { isActive: true } })

export default mongoose.model('AcademicYear', academicYearSchema)
