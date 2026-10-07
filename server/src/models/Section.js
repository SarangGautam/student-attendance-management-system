import mongoose from 'mongoose'

const sectionSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null, index: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
}, { timestamps: true })

sectionSchema.index({ classId: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } })

export default mongoose.model('Section', sectionSchema)
