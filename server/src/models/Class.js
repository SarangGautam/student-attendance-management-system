import mongoose from 'mongoose'

const classSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
}, { timestamps: true })

classSchema.index({ teacherId: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } })

export default mongoose.model('Class', classSchema)
